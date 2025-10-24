import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { Toaster } from "react-hot-toast";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import Navbar from "./components/navbar.tsx";

// ✅ Import wallet styles
import "@solana/wallet-adapter-react-ui/styles.css";
import CreatePool from "./components/create-pool.tsx";
import AddLiquidity from "./components/add-liquidity.tsx";
import RemoveLiquidity from "./components/remove-liquidity.tsx";
import Swap from "./components/swap.tsx";
import Pools from "./components/pools.tsx";

const theme = createTheme({
  palette: {
    mode: "dark", // ✅ Dark mode
    primary: {
      main: "#667eea",
      light: "#764ba2",
      dark: "#4a5ab3",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#f5f5f5",
      contrastText: "#092147",
    },
    error: {
      main: "#ff4444",
      light: "rgba(255, 68, 68, 0.1)",
      dark: "#cc0000",
    },
    success: {
      main: "#66ff77",
    },
    background: {
      default: "#0f0f1e",
      paper: "#1a1a2e",
    },
    divider: "rgba(255, 255, 255, 0.12)",
    action: {
      hover: "rgba(255, 255, 255, 0.08)",
    },
  },
  typography: {
    allVariants: {
      color: "#ffffff",
      fontFamily: "Poppins, sans-serif",
    },
  },
});

const RPC_ENDPOINT = "http://127.0.0.1:8899";

// ✅ Router setup

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navbar />,
    children: [
      {
        path: "/",
        element: <div>Home Page</div>,
      },
      {
        path: "create-pool",
        element: <CreatePool />,
      },
      {
        path: "swap",
        element: <Swap /> ,
      },
      {
        path: "pools",
        element: <Pools/> ,
      },
      {
        path: "liquidity/add",
        element: <AddLiquidity />,
      },
      {
        path: "liquidity/remove",
        element: <RemoveLiquidity />,
      },
    ],
  },
]);

// ✅ App Wrapper sa Wallet Provider
function App() {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={router} />
            <Toaster
              position="bottom-center"
              toastOptions={{
                success: {
                  style: {
                    background: theme.palette.success.main,
                    color: "#000",
                  },
                },
                error: {
                  style: {
                    background: theme.palette.error.main,
                    color: "#fff",
                  },
                },
              }}
            />
          </ThemeProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);