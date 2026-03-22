"use client";

import { Spin } from "antd";

export function LoadingScreen({ copy = "Loading Exetron admin..." }: { copy?: string }) {
  return (
    <div className="ex-admin-loading">
      <div className="ex-admin-loading__card">
        <span className="ex-admin-loading__eyebrow">Exetron</span>
        <Spin size="large" />
        <p>{copy}</p>
      </div>
    </div>
  );
}
