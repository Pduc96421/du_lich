import React, { useState } from "react";
import {
  Form,
  Input,
  Rate,
  Typography,
  Upload,
  Button,
  Space,
  Image,
} from "antd";
import {
  PlusOutlined,
} from "@ant-design/icons";
import { uploadImagesCloudinary } from "../../utils/uploadImagesCloudinary";

interface FormReviewProps {
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit?: (data: any) => void;
  tour: {
    id: number;
    name: string;
    tour_code: string;
    image: string;
  };
}

const FormReview: React.FC<FormReviewProps> = ({
  onClose,
  onSubmit,
  tour,
}) => {
  const [form] = Form.useForm();
  const [rating, setRating] = useState(5);
  const rateText = ["Tệ", "Không hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời"];
  const [isLoading, setIsLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleFinish = async (values: any) => {
  try {
    // Lấy File từ AntD Upload
    setIsLoading(true);
    const files: File[] = (values.images || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((file: any) => file.originFileObj)
      .filter(Boolean);

    // Upload Cloudinary
    let imageUrls: string[] = [];
    if (files.length > 0) {
      imageUrls = await uploadImagesCloudinary(files);
    }

    const formattedValues = {
      rating: values.rating,
      text: values.text,
      images: imageUrls.map((url) => ({
        image_url: url,
      })),
    };

    if (onSubmit) {
      await onSubmit({
        tour_id: tour.id,
        ...formattedValues,
      });
    }

    form.resetFields();
    setRating(5);
    onClose();
    setIsLoading(false);
  } catch (error) {
    console.error("Upload review failed:", error);
  }
};



  return (
    <>
      <Space align="start" style={{ marginBottom: 16 }}>
        <Image
          src={tour.image}
          width={60}
          height={60}
          preview={false}
          className="object-cover rounded-lg"
        />
        <div>
          <Typography.Title level={5}>
            {tour.name}
          </Typography.Title>
          <Typography.Text>
            {tour.tour_code}
          </Typography.Text>
        </div>
      </Space>

      <Form
        layout="vertical"
        form={form}
        onFinish={handleFinish}
        initialValues={{ rating: 5 }}
      >
        <Form.Item label="Chất lượng sản phẩm">
          <Space>
            <Form.Item name="rating" noStyle>
              <Rate allowClear={false} onChange={(val) => setRating(val)} />
            </Form.Item>
            <Typography.Text style={{ color: "#FAAD14" }}>
              {rateText[rating - 1]}
            </Typography.Text>
          </Space>
        </Form.Item>

        <Form.Item
          label="Đánh giá chi tiết"
          name="text"
          rules={[
            { required: true, message: "Vui lòng nhập đánh giá chi tiết" },
            { min: 10, message: "Đánh giá cần ít nhất 10 ký tự" },
          ]}
        >
          <Input.TextArea rows={5} />
        </Form.Item>

        <Form.Item
          label="Thêm hình ảnh"
          name="images"
          valuePropName="fileList"
          getValueFromEvent={(e) => e.fileList}
        >
          <Upload beforeUpload={() => false} listType="picture-card">
            <button
              type="button"
            >
              <PlusOutlined />
              <div className="mt-4">Upload</div>
            </button>
          </Upload>
        </Form.Item>
        <Form.Item className="mt-4">
          <Space>
            <Button onClick={onClose}>TRỞ LẠI</Button>
            <Button htmlType="submit" type="primary" loading={isLoading}>
              HOÀN THÀNH
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </>
  );
};

export default FormReview;