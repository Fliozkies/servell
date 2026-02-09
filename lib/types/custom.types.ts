export type PageName =
  | "Services"
  | "Notification"
  | "Message"
  | "Post"
  | "Profile";

export type ItemProps = {
  title: string;
  category: string;
  price: number | null;
  rating: number;
  author: string;
  image: string | null;
  reviewCount: number;
};

export type CreateServiceProps = {
  onServiceCreated: () => void; // Callback when service is successfully created
  onCancel: () => void; // Callback to go back
};
