import { spawn } from "child_process";
import path from "path";

type EEGResult = {
  emotion: "Stress" | "Calm" | "Focus";
  confidence: number;
};

export function runEEGAnalysis(): Promise<EEGResult> {
  return new Promise((resolve, reject) => {
    const pythonPath = "python"; // or python3
    const scriptPath = path.join(
      process.cwd(),
      "ml",
      "predict.py"
    );

    const processPy = spawn(pythonPath, [scriptPath]);

    let output = "";
    let error = "";

    processPy.stdout.on("data", (data) => {
      output += data.toString();
    });

    processPy.stderr.on("data", (data) => {
      error += data.toString();
    });

    processPy.on("close", (code) => {
      if (code !== 0 || error) {
        console.error("EEG ML Error:", error);
        reject(new Error("EEG analysis failed"));
      } else {
        const result = JSON.parse(output);
        resolve(result);
      }
    });
  });
}
