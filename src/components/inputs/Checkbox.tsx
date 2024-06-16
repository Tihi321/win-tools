import { styled } from "solid-styled-components";
import { Checkmark } from "../icons/Checkmark";
import { createSignal } from "solid-js";

type TCheckboxProps = {
  value: boolean;
  className?: any;
  onChange: (value: boolean) => void;
  label: string;
};

export const Button = styled("button")`
  cursor: pointer;
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
`;

const Label = styled("div")`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  font-size: 16px;
  color: ${(props) => props?.theme?.colors.text};
  margin-left: 8px;
`;

const CheckmarkBorder = styled("div")`
  width: 18px;
  height: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-style: solid;
  border-color: ${(props) => props?.theme?.colors.text};
`;

export const Checkbox = ({ onChange, label, className, value, ...rest }: TCheckboxProps) => {
  const [checked, setChecked] = createSignal(value);

  return (
    <Button
      class={className}
      onClick={() => {
        onChange(!checked());
        setChecked(!checked());
      }}
      {...rest}
    >
      <CheckmarkBorder>{checked() && <Checkmark />}</CheckmarkBorder>
      <Label>{label}</Label>
    </Button>
  );
};
