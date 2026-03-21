import type { Metadata } from "next";
import { Noto_Serif_SC } from "next/font/google";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/700.css";
import "@fontsource/lxgw-wenkai";
import "./globals.css";
import { BodyWrapper } from "@/components/layout/BodyWrapper";

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "手写成书 - 传统书法艺术创作平台",
  description: "用现代科技传承传统书法，手写春联、挂画、牌匾，感受墨香文化",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSerifSC.variable}`}
    >
      <body className="min-h-full flex flex-col bg-paper paper-texture">
        <BodyWrapper>{children}</BodyWrapper>
      </body>
    </html>
  );
}
