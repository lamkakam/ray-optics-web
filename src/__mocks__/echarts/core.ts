type EchartsInstance = {
  setOption: jest.Mock;
  dispose: jest.Mock;
  resize: jest.Mock;
};

const createEchartsInstance = (): EchartsInstance => ({
  setOption: jest.fn(),
  dispose: jest.fn(),
  resize: jest.fn(),
});

export const use = jest.fn();
export const init = jest.fn(() => createEchartsInstance());
