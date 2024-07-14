import { styled } from "solid-styled-components";
import { TextToSpeach } from "./tools/TextToSpeach";

const Container = styled("div")`
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

export const App = () => {
  return (
    <Container>
      <TextToSpeach />
    </Container>
  );
};
