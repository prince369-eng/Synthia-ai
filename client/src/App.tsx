import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SynthiaAppShell } from "./components/SynthiaAppShell";

const TaskDashboard = lazy(() => import("./pages/TaskDashboard"));
const TaskWorkspace = lazy(() => import("./pages/TaskWorkspace"));
const Library = lazy(() => import("./pages/Library"));
const Settings = lazy(() => import("./pages/Settings"));
const Projects = lazy(() => import("./pages/Projects"));
const Scheduled = lazy(() => import("./pages/Scheduled"));
const Agent = lazy(() => import("./pages/Agent"));
const Plugins = lazy(() => import("./pages/Plugins"));
const Docs = lazy(() => import("./pages/Docs"));

function RouteFallback() {
  return <div className="flex min-h-screen items-center justify-center bg-[#100e0c] text-sm text-[#b9aa99]">Loading Synthia workspace…</div>;
}

function SynthiaRoute({ children }: { children: React.ReactNode }) {
  return <SynthiaAppShell><Suspense fallback={<RouteFallback />}>{children}</Suspense></SynthiaAppShell>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}><SynthiaRoute><TaskDashboard /></SynthiaRoute></Route>
      <Route path={"/tasks/:taskId"}><SynthiaRoute><TaskWorkspace /></SynthiaRoute></Route>
      <Route path={"/tasks/:taskId/replay"}><SynthiaRoute><TaskWorkspace replayMode /></SynthiaRoute></Route>
      <Route path={"/library"}><SynthiaRoute><Library /></SynthiaRoute></Route>
      <Route path={"/projects"}><SynthiaRoute><Projects /></SynthiaRoute></Route>
      <Route path={"/scheduled"}><SynthiaRoute><Scheduled /></SynthiaRoute></Route>
      <Route path={"/agent"}><SynthiaRoute><Agent /></SynthiaRoute></Route>
      <Route path={"/plugins"}><SynthiaRoute><Plugins /></SynthiaRoute></Route>
      <Route path={"/docs"}><SynthiaRoute><Docs /></SynthiaRoute></Route>
      <Route path={"/settings"}><SynthiaRoute><Settings /></SynthiaRoute></Route>
      <Route path={"/settings/:section"}><SynthiaRoute><Settings /></SynthiaRoute></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
