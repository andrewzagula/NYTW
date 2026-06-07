import { Inter } from "next/font/google";
import localFont from "next/font/local";

// Body / UI face.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display face — Martina Plantijn (trial weights from /public). Editorial serif
// used for headlines. See Befonts-License.txt; needs a production license.
// next/font/local requires `path` to be a static string literal.
export const martina = localFont({
  variable: "--font-martina",
  display: "swap",
  src: [
    {
      path: "../public/martina-plantijn-font-family/TestMartinaPlantijn-Regular-BF663c36d1ec6d5.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/martina-plantijn-font-family/TestMartinaPlantijn-Italic-BF663c36d1ed0f9.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/martina-plantijn-font-family/TestMartinaPlantijn-Medium-BF663c36d1e5bed.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/martina-plantijn-font-family/TestMartinaPlantijn-Bold-BF663c36d1d4676.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/martina-plantijn-font-family/TestMartinaPlantijn-BoldItalic-BF663c36d1bb12d.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../public/martina-plantijn-font-family/TestMartinaPlantijn-Black-BF663c36d1526a3.otf",
      weight: "900",
      style: "normal",
    },
  ],
});
