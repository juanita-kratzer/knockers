// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "styled-components";
import { GlobalStyle } from "./GlobalStyle.js";
import theme from "./theme.js";
import AuthProvider from "./context/AuthContext.jsx";
import RoleProvider from "./context/RoleContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
