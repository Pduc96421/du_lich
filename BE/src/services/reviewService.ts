import Review from '../models/Review';
import Tour from '../models/Tour';
import User from '../models/User';
import ReviewImage from '../models/ReviewImage';
import Order from '../models/Order';
import sequelize from '../config/database';
import { QueryTypes, Op } from 'sequelize';

export interface CreateReviewDTO {
  user_id: number;
  tour_id: number;
  rating: number;
  text?: string | null;
  images?: string[]; // Array of image URLs to be stored in review_images table
  order_id?: number; // Order ID to update is_review flag
}

class ReviewService {
  // Helper function để format review response theo cấu trúc frontend expect
  private formatReviewForFrontend(review: any, user: any, images: any[]): any {
    const contents: any[] = [];

    if (review.text && review.text.trim() !== '') {
      contents.push({
        type: 'text',
        content: review.text.trim(),
      });
    }
    
    // Thêm image contents
    if (images && images.length > 0) {
      contents.push(
        ...images
          .filter(img => !!img.image_url)
          .map(img => ({
            type: 'image',
            content: img.image_url,
          }))
      );
    }

    return {
      user_id: user ? user.id : review.user_id,
      username: user ? user.username : 'Unknown User',
      avatar_url: user?.avatar_url || null,
      rating: review.rating,
      created_at: review.created_at
        ? new Date(review.created_at).toISOString()
        : new Date().toISOString(),
      contents: contents.length > 0
        ? contents
        : [{ type: 'text', content: '' }],
    };
  }

  // Helper function để tìm tour với fallback cho BIGINT
  private async findTourById(tourId: number): Promise<Tour | null> {
    // Đảm bảo tourId là number
    const id = Number(tourId);
    if (isNaN(id) || id <= 0) {
      return null;
    }

    // Thử tìm bằng findByPk trước
    let tour = await Tour.findByPk(id);

    if (tour) {
      return tour;
    }

    // Nếu không tìm thấy, thử dùng raw query với nhiều cách (vì Sequelize có thể có vấn đề với BIGINT)
    try {
      // Thử với number
      const resultsAny: any = await sequelize.query(
        'SELECT * FROM tours WHERE id = :id LIMIT 1',
        {
          replacements: { id: id },
          type: QueryTypes.SELECT,
        }
      );

      let results: any[] = [];
      if (Array.isArray(resultsAny)) {
        results = resultsAny;
      } else if (Array.isArray(resultsAny[0])) {
        results = resultsAny[0];
      } else if (resultsAny && resultsAny.length > 0) {
        results = resultsAny;
      }

      if (results && results.length > 0) {
        return Tour.build(results[0] as any, { isNewRecord: false });
      }

      // Thử với string
      const results2Any: any = await sequelize.query(
        'SELECT * FROM tours WHERE id = :id LIMIT 1',
        {
          replacements: { id: String(id) },
          type: QueryTypes.SELECT,
        }
      );

      let results2: any[] = [];
      if (Array.isArray(results2Any)) {
        results2 = results2Any;
      } else if (Array.isArray(results2Any[0])) {
        results2 = results2Any[0];
      } else if (results2Any && results2Any.length > 0) {
        results2 = results2Any;
      }

      if (results2 && results2.length > 0) {
        return Tour.build(results2[0] as any, { isNewRecord: false });
      }

      // Thử với CAST
      const results3Any: any = await sequelize.query(
        'SELECT * FROM tours WHERE CAST(id AS UNSIGNED) = CAST(:id AS UNSIGNED) LIMIT 1',
        {
          replacements: { id: String(id) },
          type: QueryTypes.SELECT,
        }
      );

      let results3: any[] = [];
      if (Array.isArray(results3Any)) {
        results3 = results3Any;
      } else if (Array.isArray(results3Any[0])) {
        results3 = results3Any[0];
      } else if (results3Any && results3Any.length > 0) {
        results3 = results3Any;
      }

      if (results3 && results3.length > 0) {
        return Tour.build(results3[0] as any, { isNewRecord: false });
      }
    } catch (error) {
      console.error('Error in findTourById raw query:', error);
    }

    return null;
  }

  // Tạo review mới
  async createReview(data: CreateReviewDTO) {
    // Đảm bảo tour_id là number
    const tourId = Number(data.tour_id);
    if (isNaN(tourId) || tourId <= 0) {
      throw new Error('ID tour không hợp lệ');
    }

    // Kiểm tra tour tồn tại với fallback
    const tour = await this.findTourById(tourId);
    if (!tour) {
      throw new Error(`Tour không tồn tại với ID: ${tourId}`);
    }

    // Kiểm tra user tồn tại
    const user = await User.findByPk(data.user_id);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    // Validate order_id (bắt buộc)
    if (!data.order_id) {
      throw new Error('ID đơn hàng là bắt buộc');
    }

    const orderId = Number(data.order_id);
    if (isNaN(orderId) || orderId <= 0) {
      throw new Error('ID đơn hàng không hợp lệ');
    }

    // Kiểm tra order tồn tại
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new Error('Đơn hàng không tồn tại');
    }

    // Kiểm tra order thuộc về user đang tạo review
    const orderUserId = order.getDataValue('user_id') || order.user_id;
    if (orderUserId !== data.user_id) {
      throw new Error('Bạn không có quyền đánh giá đơn hàng này');
    }

    // Kiểm tra tour_id của order có khớp với tour_id trong review không
    const orderTourId = order.getDataValue('tour_id') || order.tour_id;
    if (orderTourId !== data.tour_id) {
      throw new Error('Tour ID không khớp với đơn hàng');
    }

    // Kiểm tra status của order phải là 'completed'
    const orderStatus = order.getDataValue('status') || order.status;
    if (orderStatus !== 'completed') {
      throw new Error('Chỉ có thể đánh giá đơn hàng đã hoàn thành');
    }

    // Kiểm tra order đã được review chưa (is_review = false hay true)
    const orderIsReview = order.getDataValue('is_review') ?? order.is_review;
    // Convert sang boolean để xử lý - kiểm tra nếu là truthy value
    const isReviewed = Boolean(orderIsReview);
    // TẠM TẮT CHỨC NĂNG CHẶN REVIEW ĐỂ TEST JMETER:
    // if (isReviewed) {
    //   throw new Error('Đơn hàng này đã được đánh giá rồi');
    // }

    // Debug: Log data trước khi tạo review
    console.log('=== CREATE REVIEW DEBUG ===');
    console.log('Data received:', JSON.stringify(data, null, 2));
    const incomingText = data.text ?? (data as any).comment;
    console.log('incoming text:', incomingText);
    console.log('incoming text type:', typeof incomingText);
    console.log('incoming text length:', incomingText?.length);

    // Tạo object với các field rõ ràng để đảm bảo Sequelize nhận được
    const createData: any = {
      user_id: data.user_id,
      tour_id: data.tour_id,
      rating: data.rating,
    };

    // Chỉ thêm text nếu có giá trị
    if (incomingText && incomingText.trim() !== '') {
      createData.text = incomingText.trim();
      console.log('Adding text to createData:', createData.text);
    }

    console.log('createData before Review.create:', JSON.stringify(createData, null, 2));

    // Tạo review với data đã được xử lý
    const review = await Review.create(createData);

    // Lấy review ID - đảm bảo có ID trước khi lưu images
    let reviewId = review.getDataValue('id') || review.id;
    
    // Nếu không có ID, reload để lấy ID
    if (!reviewId) {
      await review.reload();
      reviewId = review.getDataValue('id') || review.id;
    }

    // Debug: Log review sau khi tạo
    console.log('Review created:', review.toJSON());
    console.log('Review id after create:', reviewId);

    // Nếu vẫn không có ID, thử lấy lại bằng cách query với user_id và tour_id
    if (!reviewId) {
      console.log('Warning: Review id is null after create, trying to fetch by user_id and tour_id');
      const fetchedReview = await Review.findOne({
        where: {
          user_id: data.user_id,
          tour_id: data.tour_id,
        },
        order: [['created_at', 'DESC']],
      });
      
      if (fetchedReview) {
        reviewId = fetchedReview.getDataValue('id') || fetchedReview.id;
        console.log('Fetched review from DB:', fetchedReview.toJSON());
        console.log('Fetched review id:', reviewId);
      } else {
        throw new Error('Không thể lấy được review ID sau khi tạo');
      }
    }

    // Đảm bảo có reviewId trước khi tiếp tục
    if (!reviewId) {
      throw new Error('Không thể lấy được review ID');
    }

    // Xử lý images array - lưu vào bảng review_images
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      console.log('Processing images:', data.images);
      
      const reviewImages = data.images
        .filter((url: string) => url && typeof url === 'string' && url.trim() !== '')
        .map((url: string) => ({
          review_id: reviewId,
          image_url: url.trim(),
        }));
      
      console.log('Review images to create:', reviewImages);
      
      if (reviewImages.length > 0) {
        try {
          const createdImages = await ReviewImage.bulkCreate(reviewImages);
          console.log('Review images created:', createdImages.length);
        } catch (error) {
          console.error('Error creating review images:', error);
          throw new Error('Không thể tạo review images: ' + (error as Error).message);
        }
      }
    }

    // Cập nhật is_review = true cho order
    try {
      const [updatedRows] = await Order.update(
        { is_review: true },
        { where: { id: orderId } }
      );
      if (updatedRows === 0) {
        throw new Error('Không thể cập nhật is_review cho order');
      }
      console.log('Order is_review updated to true for order_id:', orderId);
    } catch (error) {
      console.error('Error updating order is_review:', error);
      throw new Error('Không thể cập nhật is_review cho order: ' + (error as Error).message);
    }

    // Cập nhật rating và total_reviews của tour theo yêu cầu
    try {
      const tourToUpdate = await Tour.findByPk(data.tour_id);
      if (!tourToUpdate) {
        throw new Error(`Tour không tồn tại với ID: ${data.tour_id}`);
      }

      const currentTotalReviews =
        Number(tourToUpdate.getDataValue('total_reviews') ?? tourToUpdate.total_reviews ?? 0);
      const currentRating =
        Number(tourToUpdate.getDataValue('rating') ?? tourToUpdate.rating ?? 0);

      const newTotalReviews = currentTotalReviews + 1;
      const newRating =
        currentTotalReviews <= 0
          ? Number(data.rating)
          : Number(((currentRating* currentTotalReviews + Number(data.rating)) / (currentTotalReviews + 1)).toFixed(2));

      await tourToUpdate.update({
        total_reviews: newTotalReviews,
        rating: newRating,
      });

      console.log('Tour rating and total_reviews updated for tour_id:', data.tour_id, {
        newTotalReviews,
        newRating,
      });
    } catch (error) {
      console.error('Error updating tour rating and total_reviews:', error);
      throw new Error('Không thể cập nhật rating và total_reviews cho tour: ' + (error as Error).message);
    }

    // Reload review để đảm bảo có đầy đủ dữ liệu
    try {
      await review.reload();
      console.log('Review after reload:', review.toJSON());
    } catch (error) {
      console.log('Reload failed, but review was created:', error);
    }

    return review;
  }

  // Lấy reviews của tour
  async getTourReviews(tourId: number, page: number = 1, limit: number = 10, filters?: any) {
    const offset = (page - 1) * limit;

    // Xây dựng where clause
    const where: any = { tour_id: tourId };
    
    if (filters?.rating) {
      where.rating = filters.rating;
    }

    // Build include array
    const include: any[] = [];

    // Nếu filter withImage = true, chỉ lấy reviews có hình ảnh
    if (filters?.withImage) {
      include.push({
        model: ReviewImage,
        as: 'images',
        required: true, // INNER JOIN - chỉ lấy reviews có images
      });
    }

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where,
      include: include.length > 0 ? include : undefined,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    let currentPage = page;
    let currentReviews = reviews;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    if (total > 0) {
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      if (currentPage < 1) {
        currentPage = 1;
      }

      const adjustedOffset = (currentPage - 1) * limit;
      if (adjustedOffset !== offset) {
        currentReviews = await Review.findAll({
          where,
          include: include.length > 0 ? include : undefined,
          limit,
          offset: adjustedOffset,
          order: [['created_at', 'DESC']],
        });
      }
    } else {
      currentPage = 1;
    }

    // Lấy thông tin user và images cho mỗi review - format theo cấu trúc frontend
    const userIds = currentReviews.map(review => review.user_id);
    const reviewIds = currentReviews.map(review => review.id);

    const users = await User.findAll({
      where: { id: userIds },
    });
    const userMap = users.reduce((acc: Record<number, any>, user) => {
      acc[user.id] = user.toJSON();
      return acc;
    }, {});

    const images = await ReviewImage.findAll({
      where: { review_id: reviewIds },
    });
    const imagesByReview = images.reduce((acc: Record<number, any[]>, image) => {
      const reviewId = image.review_id;
      acc[reviewId] = acc[reviewId] || [];
      acc[reviewId].push(image.toJSON());
      return acc;
    }, {});

    const formattedReviews = currentReviews.map((review) => {
      const reviewData = review.toJSON();
      const user = userMap[review.user_id] || null;
      const reviewImages = imagesByReview[review.id] || [];
      return this.formatReviewForFrontend(reviewData, user, reviewImages);
    });

    return {
      reviews: formattedReviews,
      pagination: {
        page: total > 0 ? currentPage : 1,
        limit,
        total,
        totalPages,
      },
    };
  }

  // Lấy reviews của user
  async getUserReviews(userId: number, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    // Lấy thông tin tour cho mỗi review
    const reviewsWithTour = await Promise.all(
      reviews.map(async (review) => {
        const reviewTourId = review.getDataValue ? review.getDataValue('tour_id') : review.tour_id;
        const tour = await this.findTourById(Number(reviewTourId));
        return {
          ...review.toJSON(),
          tour: tour ? {
            id: tour.getDataValue ? tour.getDataValue('id') : tour.id,
            title: tour.getDataValue ? tour.getDataValue('title') : tour.title,
            main_image: tour.getDataValue ? tour.getDataValue('main_image') : tour.main_image,
          } : null,
        };
      })
    );

    return {
      reviews: reviewsWithTour,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Lấy tất cả reviews (admin)
  async getAllReviews(page: number = 1, limit: number = 10, filters?: any) {
    const offset = (page - 1) * limit;

    // Xây dựng where clause
    const where: any = {};
    
    if (filters?.tour_id) {
      where.tour_id = filters.tour_id;
    }
    
    if (filters?.rating) {
      where.rating = filters.rating;
    }

    // Build include array
    const include: any[] = [];

    // Nếu filter withImage = true, chỉ lấy reviews có hình ảnh
    if (filters?.withImage) {
      include.push({
        model: ReviewImage,
        as: 'images',
        required: true, // INNER JOIN - chỉ lấy reviews có images
      });
    }

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where,
      include: include.length > 0 ? include : undefined,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    // Lấy thông tin user và tour cho mỗi review
    const reviewsWithDetails = await Promise.all(
      reviews.map(async (review) => {
        const reviewTourId = review.getDataValue ? review.getDataValue('tour_id') : review.tour_id;
        const reviewUserId = review.getDataValue ? review.getDataValue('user_id') : review.user_id;
        const [user, tour] = await Promise.all([
          User.findByPk(Number(reviewUserId)),
          this.findTourById(Number(reviewTourId)),
        ]);
        return {
          ...review.toJSON(),
          user: user ? {
            id: user.getDataValue ? user.getDataValue('id') : user.id,
            username: user.getDataValue ? user.getDataValue('username') : user.username,
          } : null,
          tour: tour ? {
            id: tour.getDataValue ? tour.getDataValue('id') : tour.id,
            title: tour.getDataValue ? tour.getDataValue('title') : tour.title,
          } : null,
        };
      })
    );

    return {
      reviews: reviewsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Cập nhật review
  async updateReview(id: number, userId: number, data: Partial<CreateReviewDTO>) {
    const review = await Review.findByPk(id);

    if (!review) {
      throw new Error('Review không tồn tại');
    }

    // Chỉ cho phép user sở hữu review hoặc admin (userId = 0) được cập nhật
    if (userId !== 0 && review.user_id !== userId) {
      throw new Error('Bạn không có quyền cập nhật review này');
    }

    const updateData: Partial<CreateReviewDTO> = { ...data };

    // Hỗ trợ backward compatibility với payload dùng 'comment'
    const legacyComment = (data as any)?.comment;
    if (legacyComment !== undefined && updateData.text === undefined) {
      updateData.text = legacyComment;
    }

    if (updateData.text !== undefined) {
      const trimmedText = updateData.text ? updateData.text.trim() : '';
      updateData.text = trimmedText !== '' ? trimmedText : null;
    }
    // Xử lý images array nếu có
    let imageUrls: string[] | undefined = undefined;
    if ((data as any).images !== undefined) {
      if (Array.isArray((data as any).images)) {
        // Xử lý mảng: [{image_url: '...'}, {image_url: '...'}] hoặc ['url1', 'url2']
        imageUrls = (data as any).images
          .map((img: any) => {
            if (typeof img === 'string') {
              return img.trim();
            } else if (img && typeof img === 'object' && img.image_url) {
              return img.image_url.trim();
            }
            return null;
          })
          .filter((url: string | null) => url && url !== '');
      } else if (typeof (data as any).images === 'string') {
        imageUrls = [(data as any).images.trim()];
      }
    }

    await review.update(updateData);

    // Update review images if provided
    if (imageUrls !== undefined) {
      // Delete existing images
      await ReviewImage.destroy({ where: { review_id: id } });
      
      // Create new images if provided
      if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        const reviewImages = imageUrls
          .filter(url => url && url.trim() !== '')
          .map(url => ({
            review_id: id,
            image_url: url.trim(),
          }));
        
        if (reviewImages.length > 0) {
          await ReviewImage.bulkCreate(reviewImages);
        }
      }
    }

    // Cập nhật lại rating của tour
    await this.updateTourRating(review.tour_id);

    return review;
  }

  // Xóa review
  async deleteReview(id: number, userId: number) {
    const review = await Review.findByPk(id);

    if (!review) {
      throw new Error('Review không tồn tại');
    }

    // Chỉ cho phép user sở hữu review hoặc admin (userId = 0) được xóa
    if (userId !== 0 && review.user_id !== userId) {
      throw new Error('Bạn không có quyền xóa review này');
    }

    const tourId = review.tour_id;
    await review.destroy();

    // Cập nhật lại rating của tour
    await this.updateTourRating(tourId);

    return { message: 'Xóa review thành công' };
  }

  // Cập nhật rating trung bình của tour
  private async updateTourRating(tourId: number) {
    const reviews = await Review.findAll({
      where: { tour_id: tourId },
    });

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    await Tour.update(
      {
        rating: Number(avgRating.toFixed(2)),
        total_reviews: totalReviews,
      },
      {
        where: { id: tourId },
      }
    );
  }

  // Lấy thống kê reviews
  async getReviewStats(tourId?: number) {
    const where = tourId ? { tour_id: tourId } : {};
    
    const reviews = await Review.findAll({ where });

    const total = reviews.length;
    const avgRating = total > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
      : 0;

    // Đếm số lượng theo từng rating
    const ratingCounts = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    return {
      total,
      avgRating: Number(avgRating.toFixed(2)),
      ratingCounts,
    };
  }

  // Lấy 10 reviews 5 sao mới nhất
  async getTop5StarReviews() {
    const reviews = await Review.findAll({
      where: { rating: 5 },
      limit: 10,
      order: [['created_at', 'DESC']],
    });

    // Lấy thông tin user và images cho mỗi review - format theo cấu trúc frontend
    const userIds = reviews.map(review => review.user_id);
    const users = await User.findAll({
      where: { id: userIds },
    });

    const userMap = users.reduce((acc: Record<number, any>, user) => {
      acc[user.id] = user.toJSON();
      return acc;
    }, {});

    const reviewIds = reviews.map(review => review.id);
    const images = await ReviewImage.findAll({
      where: { review_id: reviewIds },
    });

    const imagesByReview = images.reduce((acc: Record<number, any[]>, image) => {
      const reviewId = image.review_id;
      acc[reviewId] = acc[reviewId] || [];
      acc[reviewId].push(image.toJSON());
      return acc;
    }, {});

    const formattedReviews = reviews.map((review) => {
      const reviewData = review.toJSON();
      const user = userMap[review.user_id] || null;
      const reviewImages = imagesByReview[review.id] || [];
      return this.formatReviewForFrontend(reviewData, user, reviewImages);
    });

    return formattedReviews;
  }
}

export default new ReviewService();
