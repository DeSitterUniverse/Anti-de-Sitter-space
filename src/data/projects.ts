/** Project data for the Projects showcase section */
export interface Project {
  title: string;
  description: string;
  descriptionLink?: {
    text: string;
    url: string;
  };
  tech: string[];
  github: string;
  demo?: string;
}

export const projects: Project[] = [
  {
    title: "Cephalon",
    description:
      "Cephalon is a local-first desktop RAG app for running LLM inference on document collections. It imports PDFs, Office documents, spreadsheets, text files, and structured data into a transparent hybrid retrieval pipeline combining LanceDB semantic search, SQLite FTS5 keyword search, reciprocal-rank fusion, and full-set listwise reranking.\n\nCephalon preserves exact source provenance such as PDF pages, layout, tables, captions, and bounding boxes. It validates evidence and claim coverage before returning answers with stable citations, retrieval traces, confidence diagnostics, and fail-safe no-answer behaviour.\n\nConnect your own locally running llama.cpp chat model while keeping documents, indexes, metadata, telemetry, and chat history on your computer. Cephalon is particularly useful with models fine-tuned for specialised knowledge domains, tasks, writing styles, programming conventions, academic subjects, accessibility preferences, or creative work.",
    tech: ["TypeScript", "Python", "Rust", "GPUI-CE", "React", "LanceDB", "SQLite", "llama.cpp", "Transformers"],
    github: "https://github.com/DeSitterUniverse/Cephalon",
  },
  {
    title: "Titchy-rs",
    description:
      "A Rust implementation of Titchy for lossless compression of fixed-width sensor time series, with bounded-memory streaming, adaptive deduplication, and indexed random access.",
    descriptionLink: {
      text: "Titchy",
      url: "https://doi.org/10.1109/JIOT.2021.3081868",
    },
    tech: ["Rust", "Streaming Data", "Sensor Data", "Lossless Compression"],
    github: "https://github.com/DeSitterUniverse/Titchy-rs",
  },
  {
    title: "ssd-flash-id",
    description:
      "Brought the open-source ssd-flash-id hardware utility from Linux to Windows, allowing users to identify SSD controllers and NAND flash without relying on a Linux environment. The port focused on making low-level drive inspection practical and reliable on Windows, with native device discovery, permission handling, safer probing, clearer diagnostics, and improved compatibility across different SSDs and storage configurations.\n\nUnder the hood, the project was refactored to separate platform-specific storage transports while preserving the existing controller and NAND identification logic. I implemented native Win32 NVMe and ATA pass-through, physical-drive enumeration, StorNVMe vendor-command validation, storage-adapter fallback, aligned protocol packet construction, UAC elevation checks, configurable command timeouts, response/status validation, and Windows system error reporting.",
    tech: ["Rust", "Win32 API", "NVMe / ATA", "Systems Programming"],
    github: "https://github.com/DeSitterUniverse/ssd-flash-id",
  },
  {
    title: "Adaptive OLED Clock",
    description:
      "Adaptive OLED Clock is a native Windows desktop clock for OLED displays. It keeps the time visible in a transparent, click-through overlay while varying its position so exposure is not concentrated in one fixed area. Built with C++20, Win32, Direct2D, and DirectWrite, it supports configurable time formats, typography, opacity, monitor selection, movement modes, brightness boosts, fullscreen hiding, and tray controls.\n\nThe app tracks coarse exposure history independently for each monitor and uses that history when choosing future positions (exposure based heuristic).",
    tech: ["C++20", "Win32 API", "Direct2D / DirectWrite", "CMake"],
    github: "https://github.com/DeSitterUniverse/Adaptive-OLED-Clock",
  },
];
