import { Op } from 'sequelize';
import User from "../models/User";
import Admin from "../models/Admin";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import sendOTPEmail from './googleAuthService';
import { isValidEmail } from '../utils/validation';

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateProfileDTO {
  username?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  gender?: string;
}

export interface ChangePasswordDTO {
  current_password: string;
  new_password: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string;
  new_password: string;
  otp: string;
}

class AuthService {
  // Đăng ký người dùng mới
  async register(data: RegisterDTO) {
    // Validation
    if (!data.email || !data.password || !data.username) {
      throw new Error("Vui lòng nhập đầy đủ thông tin đăng ký");
    }

    if (
      typeof data.email !== "string" ||
      typeof data.password !== "string" ||
      typeof data.username !== "string"
    ) {
      throw new Error("Email, username và password phải là chuỗi");
    }

    // Kiểm tra độ dài password
    if (data.password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({
      where: { email: data.email.trim() },
    });
    if (existingUser) {
      console.log(`[REGISTER ERROR] Trùng email - Email đã tồn tại: ${data.email.trim()}`);
      throw new Error("Trùng email");
    }

    // Kiểm tra username đã tồn tại
    const existingUsername = await User.findOne({
      where: { username: data.username.trim() },
    });
    if (existingUsername) {
      throw new Error("Tên người dùng đã được sử dụng");
    }

    // Hash password với bcrypt (salt rounds = 10)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Tạo user mới với password đã được hash
    let user;
    try {
      user = await User.create({
        username: data.username.trim(),
        email: data.email.trim(),
        password_hash: hashedPassword,
        phone: data.phone.trim(),
        is_active: true,
        google_id: null, 
      });
    } catch (error: any) {
      // Nếu có lỗi khi tạo user
      if (error.errors && error.errors.length > 0) {
        // Kiểm tra lỗi duplicate email từ database constraint
        const duplicateEmailError = error.errors.find((e: any) => 
          e.type === 'unique violation' && 
          (e.path === 'email' || e.message?.toLowerCase().includes('email'))
        );
        
        if (duplicateEmailError) {
          console.log(`[REGISTER ERROR] Trùng email (database constraint) - Email: ${data.email.trim()}`);
          throw new Error("Trùng email");
        }
        
        const errorMessage = error.errors.map((e: any) => e.message).join(", ");
        throw new Error(`Lỗi khi tạo tài khoản: ${errorMessage}`);
      }
      
      // Kiểm tra lỗi duplicate từ Sequelize
      if (error.name === 'SequelizeUniqueConstraintError') {
        const emailField = error.errors?.find((e: any) => e.path === 'email');
        if (emailField) {
          console.log(`[REGISTER ERROR] Trùng email (Sequelize constraint) - Email: ${data.email.trim()}`);
          throw new Error("Trùng email");
        }
      }
      
      throw error.message
        ? error
        : new Error("Lỗi khi tạo tài khoản. Vui lòng thử lại");
    }

    // User đã được tạo thành công, trả về thông tin user
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
    };
  }

  // Đăng nhập
  async login(data: LoginDTO) {
    // Validation
    if (!data.email || !data.password) {
      throw new Error("Vui lòng nhập đầy đủ email và mật khẩu");
    }

    if (typeof data.email !== "string" || typeof data.password !== "string") {
      throw new Error("Email và mật khẩu phải là chuỗi");
    }

    // Tìm user - đảm bảo lấy được password_hash
    const user = await User.findOne({
      where: { email: data.email.trim() },
      raw: false, // Đảm bảo trả về Model instance để dùng comparePassword
    });
    
    // Kiểm tra tài khoản có tồn tại không
    if (!user) {
      console.log(`[LOGIN ERROR] Sai tài khoản - Email không tồn tại: ${data.email.trim()}`);
      throw new Error("Sai tài khoản");
    }

    // Lấy password_hash từ dataValues nếu cần (Sequelize có thể không map vào property)
    let passwordHash = user.password_hash || user.getDataValue("password_hash");

    // Nếu vẫn không có, reload từ DB
    if (!passwordHash) {
      await user.reload({ attributes: { include: ['password_hash'] } });
      passwordHash = user.password_hash || user.getDataValue("password_hash");
    }

    // Kiểm tra password_hash có tồn tại và hợp lệ không
    if (!passwordHash || (typeof passwordHash === "string" && passwordHash.trim() === "")) {
      throw new Error("Tài khoản không hợp lệ. Vui lòng liên hệ quản trị viên");
    }

    // Kiểm tra password_hash có đúng format bcrypt không
    if (!passwordHash.startsWith("$2a$") && !passwordHash.startsWith("$2b$")) {
      throw new Error("Tài khoản không hợp lệ. Vui lòng liên hệ quản trị viên");
    }

    // Set password_hash vào user instance để comparePassword có thể dùng
    if (!user.password_hash) {
      user.password_hash = passwordHash;
    }

    // Kiểm tra password sử dụng method comparePassword của model
    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      console.log(`[LOGIN ERROR] Sai mật khẩu - Email: ${data.email.trim()}, User ID: ${user.id}`);
      throw new Error("Sai mật khẩu");
    }

    // Kiểm tra tài khoản có active không
    // Lấy is_active từ dataValues nếu cần
    // MySQL có thể trả về 1/0 (number) hoặc true/false (boolean)
    let isActive: any = user.is_active !== undefined
      ? user.is_active
      : user.getDataValue("is_active");
    
    // Xử lý cả trường hợp number (0/1) và boolean (true/false)
    if (isActive === undefined || isActive === null) {
      // Nếu không có giá trị, mặc định là false (không active)
      isActive = false;
    }
    
    // Chuyển đổi về boolean: 0, false, null, undefined -> false; còn lại -> true
    const isActiveBoolean = 
      isActive === true || 
      isActive === 1 || 
      (typeof isActive === 'number' && isActive !== 0) || 
      (typeof isActive === 'string' && isActive === '1');
    
    if (!isActiveBoolean) {
      console.error("User account is not active:", {
        userId: user.id,
        isActive: isActive,
        type: typeof isActive,
      });
      throw new Error("Tài khoản đã bị vô hiệu hóa");
    }

    // Lấy user.id từ dataValues nếu cần (Sequelize có thể không map vào property)
    const userIdRaw = user.id || user.getDataValue("id");
    if (!userIdRaw) {
      console.error("ERROR: User ID is missing!", {
        user: user.toJSON(),
        dataValues: user.get(),
      });
      throw new Error("Lỗi khi tạo token. Vui lòng thử lại");
    }

    // Chuyển đổi userId sang number (MySQL có thể trả về BigInt hoặc string)
    const userId = typeof userIdRaw === 'number' 
      ? userIdRaw 
      : typeof userIdRaw === 'bigint' 
        ? Number(userIdRaw)
        : parseInt(String(userIdRaw), 10);
    
    if (isNaN(userId) || userId <= 0) {
      console.error("ERROR: Invalid user ID format!", {
        userIdRaw,
        userId,
        type: typeof userIdRaw,
      });
      throw new Error("Lỗi khi tạo token. Vui lòng thử lại");
    }

    // Kiểm tra env vars
    if (!process.env.JWT_SECRET) {
      console.error("ERROR: JWT_SECRET is not configured!");
      throw new Error("Lỗi cấu hình server. Vui lòng liên hệ quản trị viên");
    }

    // Kiểm tra xem user có phải là admin không
    let role: 'user' | 'admin' = 'user';
    try {
      const admin = await Admin.findOne({ where: { email: user.email } });
      if (admin && admin.is_active) {
        role = 'admin';
      }
    } catch (error) {
      // Nếu lỗi khi kiểm tra admin, vẫn cho phép login với role user
      console.log("Không thể kiểm tra admin role, mặc định là user");
    }

    let accessToken: string;
    let refreshToken: string;
    try {
      accessToken = generateAccessToken(userId, role);
      refreshToken = generateRefreshToken(userId); // Refresh token chỉ chứa id
    } catch (error: any) {
      console.error("ERROR generating tokens:", error.message);
      throw new Error("Lỗi khi tạo token. Vui lòng thử lại");
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        role: role, // Thêm role vào response
      },
      accessToken,
      refreshToken,
    };
  }

  // Refresh token - Tạo access token mới từ refresh token
  async refreshToken(refreshToken: string) {
    try {
      // Fallback về JWT_SECRET nếu không có JWT_REFRESH_SECRET
      const secret =
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET is not configured");
      }

      // Verify refresh token
      const decoded: any = jwt.verify(refreshToken, secret);

      // Refresh token chỉ chứa id, không có role
      // Kiểm tra decoded có id không
      if (!decoded || !decoded.id) {
        throw new Error("Refresh token không hợp lệ");
      }

      // Chuyển đổi decoded.id sang number (MySQL có thể cần number)
      const decodedIdRaw = decoded.id;
      const decodedId = typeof decodedIdRaw === 'number' 
        ? decodedIdRaw 
        : typeof decodedIdRaw === 'bigint' 
          ? Number(decodedIdRaw)
          : parseInt(String(decodedIdRaw), 10);
      
      if (isNaN(decodedId) || decodedId <= 0) {
        throw new Error("Refresh token không hợp lệ");
      }

      // Tìm user theo ID trong token (thử nhiều cách)
      let user = await User.findByPk(decodedId, {
        attributes: { exclude: ['password_hash'] },
      });

      // Nếu không tìm thấy, thử raw query
      if (!user) {
        try {
          const { QueryTypes } = await import('sequelize');
          const [users]: any = await User.sequelize!.query(
            'SELECT id, username, email, phone, avatar_url, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
            {
              replacements: [decodedId],
              type: QueryTypes.SELECT,
            }
          );
          
          if (Array.isArray(users) && users.length > 0) {
            user = User.build(users[0], { isNewRecord: false });
          }
        } catch (error: any) {
          console.error("❌ Lỗi khi chạy raw query:", error.message);
        }
      }

      if (!user) {
        throw new Error("Người dùng không tồn tại");
      }

      // Kiểm tra tài khoản có active không
      // MySQL có thể trả về 1/0 (number) hoặc true/false (boolean)
      let isActive: any = user.is_active !== undefined
        ? user.is_active
        : user.getDataValue("is_active");
      
      // Xử lý cả trường hợp number (0/1) và boolean (true/false)
      if (isActive === undefined || isActive === null) {
        isActive = false;
      }
      
      // Chuyển đổi về boolean
      const isActiveBoolean = 
        isActive === true || 
        isActive === 1 || 
        (typeof isActive === 'number' && isActive !== 0) || 
        (typeof isActive === 'string' && isActive === '1');
      
      if (!isActiveBoolean) {
        throw new Error("Tài khoản đã bị vô hiệu hóa");
      }

      // Lấy và chuyển đổi userId sang number
      const userIdRaw = user.id || user.getDataValue("id");
      
      if (!userIdRaw) {
        throw new Error("Người dùng không hợp lệ");
      }

      const userId = typeof userIdRaw === 'number' 
        ? userIdRaw 
        : typeof userIdRaw === 'bigint' 
          ? Number(userIdRaw)
          : parseInt(String(userIdRaw), 10);
      
      if (isNaN(userId) || userId <= 0) {
        throw new Error("Người dùng không hợp lệ");
      }

      // Lấy role từ database (không lấy từ refresh token vì token không chứa role)
      let role: 'user' | 'admin' = 'user';
      
      // Kiểm tra xem user có phải là admin không
      try {
        const admin = await Admin.findOne({ where: { email: user.email } });
        if (admin && admin.is_active) {
          role = 'admin';
        }
      } catch (error) {
        // Mặc định là user nếu có lỗi
        role = 'user';
      }

      // Tạo access token mới với role từ database
      const newAccessToken = generateAccessToken(userId, role);

      return {
        accessToken: newAccessToken,
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Refresh token đã hết hạn. Vui lòng đăng nhập lại");
      }
      if (error.name === "JsonWebTokenError") {
        throw new Error("Refresh token không hợp lệ");
      }
      throw error;
    }
  }

  // Lấy thông tin user theo ID
  async getUserById(userId: number) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    return user;
  }

  // Cập nhật profile
  async updateProfile(userId: number, data: UpdateProfileDTO) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    // Kiểm tra email nếu có thay đổi
    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({
        where: { 
          email: data.email,
          id: { [Op.ne]: userId }
        },
      });
      if (existingUser) {
        throw new Error("Email đã được sử dụng");
      }
    }

    // Xây dựng object chứa các field cần update
    const updateData: any = {};
    
    if (data.username) {
      updateData.username = data.username;
    }
    if (data.email) {
      updateData.email = data.email;
    }
    if (data.phone) {
      updateData.phone = data.phone;
    }
    if (data.avatar_url) {
      updateData.avatar_url = data.avatar_url;
    }
    if (data.gender) {  
      updateData.gender = data.gender;
    }

    // Nếu không có gì để update
    if (Object.keys(updateData).length === 0) {
      throw new Error("Không có dữ liệu nào để cập nhật");
    }

    // Sử dụng update() method để đảm bảo lưu vào database
    const [affectedRows] = await User.update(updateData, {
      where: { id: userId },
    });

    // Kiểm tra xem có row nào được update không
    if (affectedRows === 0) {
      throw new Error("Không thể cập nhật thông tin. Vui lòng thử lại.");
    }

    // Reload user để lấy dữ liệu mới nhất từ database
    await user.reload();

    // Lấy giá trị từ dataValues để tránh vấn đề với public class fields
    const userIdValue = user.getDataValue('id');
    const usernameValue = user.getDataValue('username');
    const emailValue = user.getDataValue('email');
    const phoneValue = user.getDataValue('phone');
    const avatarUrlValue = user.getDataValue('avatar_url');
    const genderValue = user.getDataValue('gender');

    return {
      id: userIdValue,
      username: usernameValue,
      email: emailValue,
      phone: phoneValue,
      avatar_url: avatarUrlValue,
      gender: genderValue,
    };
  }

  // Đổi mật khẩu
  async changePassword(userId: number, data: ChangePasswordDTO) {
    // Tìm user với password_hash
    const user = await User.findByPk(userId, {
      attributes: { include: ['password_hash'] },
    });

    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    // Kiểm tra nếu là tài khoản Google
    const googleId = user.google_id || user.getDataValue("google_id");
    if (googleId !== null && googleId !== undefined && googleId !== "") {
      throw new Error("Tài khoản này không được sử dụng tính năng này vì tài khoản Google không có mật khẩu");
    }

    // Lấy password_hash từ dataValues nếu cần
    let passwordHash = user.password_hash || user.getDataValue("password_hash");

    // Nếu vẫn không có, reload từ DB
    if (!passwordHash) {
      await user.reload({ attributes: { include: ['password_hash'] } });
      passwordHash = user.password_hash || user.getDataValue("password_hash");
    }

    // Kiểm tra password_hash có tồn tại không
    if (!passwordHash || (typeof passwordHash === "string" && passwordHash.trim() === "")) {
      throw new Error("Tài khoản không hợp lệ. Vui lòng liên hệ quản trị viên");
    }

    // Set password_hash vào user instance để comparePassword có thể dùng
    if (!user.password_hash) {
      user.password_hash = passwordHash;
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.comparePassword(data.current_password);
    if (!isMatch) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    // Hash mật khẩu mới trước khi update
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.new_password, salt);

    // Sử dụng update() method để đảm bảo lưu vào database
    const [affectedRows] = await User.update(
      { password_hash: hashedPassword },
      { where: { id: userId } }
    );

    // Kiểm tra xem có row nào được update không
    if (affectedRows === 0) {
      throw new Error("Không thể cập nhật mật khẩu. Vui lòng thử lại.");
    }

    return true;
  }

  // Cập nhật trạng thái user (Admin)
  async updateUserStatus(userId: number, is_active: boolean) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }
    user.is_active = is_active;
    await user.save();

    return user;
  }

  // Quên mật khẩu - Gửi OTP
  async forgotPassword(data: ForgotPasswordDTO) {
    // Validation
    if (!data.email) {
      throw new Error("Vui lòng nhập email");
    }

    if (typeof data.email !== "string") {
      throw new Error("Email phải là chuỗi");
    }

    // Validate email format
    if (!isValidEmail(data.email)) {
      throw new Error("Email không hợp lệ");
    }

    // Kiểm tra user có tồn tại không
    const user = await User.findOne({
      where: { email: data.email.trim() },
    });

    if (!user) {
      throw new Error("Email không tồn tại trong hệ thống");
    }

    // Kiểm tra nếu là tài khoản Google
    const googleId = user.google_id || user.getDataValue("google_id");
    if (googleId !== null && googleId !== undefined && googleId !== "") {
      throw new Error("Tài khoản này không được sử dụng tính năng này vì tài khoản Google không có mật khẩu");
    }

    // Import generateOTP và otpStore
    const generateOTP = (await import('../helper/generateOTP')).default;
    const otpStore = (await import('../helper/otpStore')).default;

    // Generate OTP
    const otp = generateOTP();

    // Store OTP with timestamp (5 phút)
    otpStore.set(data.email.trim(), {
      otp,
      timestamp: Date.now(),
      attempts: 0,
    });

    // Send OTP via email
    let emailSent = false;
    try {
      await sendOTPEmail(data.email.trim(), otp);
      emailSent = true;
      console.log(`✅ OTP email đã được gửi đến ${data.email.trim()}`);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
      // Trong development, chỉ log warning một lần và log OTP
      if (process.env.NODE_ENV !== 'production') {
        // Chỉ log error một lần, không log lặp lại
        if (!errorMessage.includes('Thiếu cấu hình email')) {
          // Chỉ log nếu là lỗi OAuth để hướng dẫn user
          if (errorMessage.includes('unauthorized_client') || errorMessage.includes('invalid_client') || errorMessage.includes('invalid_grant') || 
              errorMessage.includes('Invalid login') || errorMessage.includes('535-5.7.8') || errorMessage.includes('BadCredentials')) {
            console.warn(`⚠️  [EMAIL CONFIG] ${errorMessage.split('\n')[0]}`);
            console.warn(`⚠️  Xem README.md phần "Email OAuth Setup" để biết cách cấu hình.`);
            // Log thêm hướng dẫn nếu có
            if (errorMessage.includes('\n')) {
              const lines = errorMessage.split('\n');
              if (lines.length > 1) {
                console.warn(`⚠️  ${lines.slice(1, 3).join('\n⚠️  ')}`);
              }
            }
          } else {
            console.error("❌ Error sending OTP email:", errorMessage.split('\n')[0]);
          }
        }
        // Luôn log OTP trong development để test
        console.log(`📧 [DEBUG MODE] OTP cho ${data.email.trim()}: ${otp}`);
        // Không throw error trong development để không block flow
      } else {
        // Trong production, log warning
        console.warn(`⚠️  Không thể gửi email OTP: ${errorMessage.split('\n')[0]}`);
        // Không throw error để không block user flow
      }
    }

    return {
      message: "Mã OTP đã được gửi đến email của bạn",
      email: data.email.trim(),
      // Chỉ trả về OTP trong development
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    };
  }

  // Đặt lại mật khẩu - Reset password với OTP
  async resetPassword(data: ResetPasswordDTO) {
    // Validation
    if (!data.email || !data.new_password || !data.otp) {
      throw new Error("Vui lòng nhập đầy đủ email, OTP và mật khẩu mới");
    }

    if (typeof data.email !== "string" || typeof data.new_password !== "string" || typeof data.otp !== "string") {
      throw new Error("Thông tin không hợp lệ");
    }

    // Validate email format
    if (!isValidEmail(data.email)) {
      throw new Error("Email không hợp lệ");
    }

    // Validate password strength
    if (data.new_password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Import otpStore
    const otpStore = (await import('../helper/otpStore')).default;

    // Kiểm tra OTP
    const otpData = otpStore.get(data.email.trim());
    if (!otpData) {
      throw new Error("OTP không tồn tại. Vui lòng yêu cầu OTP mới");
    }

    // Kiểm tra OTP đã hết hạn chưa (5 phút)
    if (Date.now() - otpData.timestamp > 5 * 60 * 1000) {
      otpStore.delete(data.email.trim());
      throw new Error("OTP đã hết hạn. Vui lòng yêu cầu OTP mới");
    }

    // Kiểm tra số lần thử
    if (otpData.attempts >= 3) {
      otpStore.delete(data.email.trim());
      throw new Error("Đã vượt quá số lần thử. Vui lòng yêu cầu OTP mới");
    }

    // Kiểm tra OTP có đúng không
    if (otpData.otp !== data.otp.trim()) {
      otpData.attempts++;
      throw new Error("OTP không chính xác");
    }

    // Tìm user
    const user = await User.findOne({
      where: { email: data.email.trim() },
    });

    if (!user) {
      throw new Error("Email không tồn tại trong hệ thống");
    }

    // Kiểm tra nếu là tài khoản Google
    const googleId = user.google_id || user.getDataValue("google_id");
    if (googleId !== null && googleId !== undefined && googleId !== "") {
      throw new Error("Tài khoản này không được sử dụng tính năng này vì tài khoản Google không có mật khẩu");
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.new_password, salt);

    // Cập nhật mật khẩu
    const [affectedRows] = await User.update(
      { password_hash: hashedPassword },
      { where: { id: user.id } }
    );

    if (affectedRows === 0) {
      throw new Error("Không thể cập nhật mật khẩu. Vui lòng thử lại");
    }

    // Xóa OTP sau khi đổi mật khẩu thành công
    otpStore.delete(data.email.trim());

    return {
      message: "Đặt lại mật khẩu thành công",
    };
  }
}

export default new AuthService();
