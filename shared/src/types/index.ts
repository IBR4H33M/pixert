export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}
