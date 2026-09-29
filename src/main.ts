import "./styles.css";
import { startApp } from "./app";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app element in index.html");
startApp(root);
