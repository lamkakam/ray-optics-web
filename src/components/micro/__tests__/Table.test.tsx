import React from "react";
import { render, screen, within } from "@testing-library/react";
import { Table } from "@/components/micro/Table";

const headers = ["Name", "Value", "Extra"];
const rows = [
  ["Spherical Aberration", "0.100000"],
  ["Coma", 0.2, <span key="node">custom</span>],
];

describe("Table", () => {
  it("renders a <table> element", () => {
    render(<Table headers={headers} rows={rows} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders the correct number of <th> elements with header text", () => {
    render(<Table headers={headers} rows={rows} />);
    const colHeaders = screen.getAllByRole("columnheader");
    expect(colHeaders).toHaveLength(headers.length);
    expect(colHeaders[0]).toHaveTextContent("Name");
    expect(colHeaders[1]).toHaveTextContent("Value");
    expect(colHeaders[2]).toHaveTextContent("Extra");
  });

  it("renders the correct number of <tr> rows in <tbody>", () => {
    render(<Table headers={headers} rows={rows} />);
    const tbody = screen.getByRole("table").querySelector("tbody");
    expect(tbody?.querySelectorAll("tr")).toHaveLength(rows.length);
  });

  it("renders string cell content", () => {
    render(<Table headers={headers} rows={rows} />);
    expect(screen.getByText("Spherical Aberration")).toBeInTheDocument();
    expect(screen.getByText("0.100000")).toBeInTheDocument();
  });

  it("renders numeric cell content", () => {
    render(<Table headers={headers} rows={rows} />);
    expect(screen.getByText("0.2")).toBeInTheDocument();
  });

  it("renders ReactNode cell content", () => {
    render(<Table headers={headers} rows={rows} />);
    expect(screen.getByText("custom")).toBeInTheDocument();
  });

  it("applies columnheader role to <th> elements", () => {
    render(<Table headers={headers} rows={rows} />);
    const colHeaders = screen.getAllByRole("columnheader");
    expect(colHeaders.length).toBeGreaterThan(0);
    colHeaders.forEach((th) => expect(th.tagName).toBe("TH"));
  });

  it("renders with no rows gracefully", () => {
    render(<Table headers={headers} rows={[]} />);
    const tbody = screen.getByRole("table").querySelector("tbody");
    expect(tbody?.querySelectorAll("tr")).toHaveLength(0);
  });
});
