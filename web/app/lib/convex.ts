import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

export const convexClient = new ConvexReactClient(CONVEX_URL || "https://intent-horse-742.convex.cloud");
