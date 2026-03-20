import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock context providers so we can test MainContent in isolation
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <>{children}</>,
  useFileSystem: vi.fn(() => ({
    fileSystem: { serialize: () => ({}) },
    getAllFiles: () => new Map(),
    refreshTrigger: 0,
    handleToolCall: vi.fn(),
    selectedFile: null,
    setSelectedFile: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    getFileContent: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <>{children}</>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    append: vi.fn(),
  })),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

afterEach(() => {
  cleanup();
});

test("renders Preview tab as active by default", () => {
  render(<MainContent />);
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });
  expect(previewTab).toHaveAttribute("data-state", "active");
  expect(codeTab).toHaveAttribute("data-state", "inactive");
});

test("shows PreviewFrame when Preview tab is active", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
});

test("switches to Code view when Code tab is clicked", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(codeTab).toHaveAttribute("data-state", "active");
  expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
    "data-state",
    "inactive"
  );
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
  expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();
});

test("switches back to Preview view when Preview tab is clicked", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Go to Code first
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();

  // Switch back to Preview
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
});

test("shows FileTree alongside CodeEditor in Code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));

  expect(screen.getByTestId("file-tree")).toBeInTheDocument();
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
});
