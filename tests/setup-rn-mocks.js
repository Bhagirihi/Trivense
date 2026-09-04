const React = require("react");
const { createElement } = require("react");

function mockHostComponent(displayName) {
  const MockNativeMethods = jest.requireActual(
    "react-native/jest/MockNativeMethods"
  ).default;

  class Host extends React.Component {
    static displayName = displayName;
    render() {
      return createElement(displayName, this.props, this.props.children);
    }
  }

  Object.assign(Host.prototype, MockNativeMethods);
  return Host;
}

jest.mock("react-native/Libraries/Text/Text", () => ({
  __esModule: true,
  default: mockHostComponent("Text"),
}));

jest.mock("react-native/Libraries/Components/View/View", () => ({
  __esModule: true,
  default: mockHostComponent("View"),
}));

jest.mock("react-native/Libraries/Components/TextInput/TextInput", () => ({
  __esModule: true,
  default: mockHostComponent("TextInput"),
}));

jest.mock("react-native/Libraries/Components/ScrollView/ScrollView", () => ({
  __esModule: true,
  default: mockHostComponent("ScrollView"),
}));

jest.mock(
  "react-native/Libraries/Components/ActivityIndicator/ActivityIndicator",
  () => ({
    __esModule: true,
    default: mockHostComponent("ActivityIndicator"),
  })
);

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: mockHostComponent("Modal"),
}));

jest.mock("react-native/Libraries/Image/Image", () => ({
  __esModule: true,
  default: mockHostComponent("Image"),
}));
