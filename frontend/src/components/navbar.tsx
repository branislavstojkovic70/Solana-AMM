import React from "react";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { SwapHoriz, Waves, Add } from "@mui/icons-material";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTheme } from "@mui/material/styles";

export default function Navbar() {
  const navigate = useNavigate();
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const theme = useTheme();

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Get wallet icon
  const getWalletIcon = () => {
    if (wallet?.adapter?.icon) {
      return wallet.adapter.icon;
    }
    return "/logo.png"; // Fallback to app logo
  };

  // Get wallet name
  const getWalletName = () => {
    return wallet?.adapter?.name || "Wallet";
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar
        position="relative"
        sx={{
          flex: "0 1 auto",
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
          boxShadow: `0 2px 10px ${theme.palette.primary.dark}`,
        }}
      >
        <Toolbar
          sx={{
            minHeight: "70px",
            px: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo Section */}
          <Box
            onClick={() => navigate("/")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              cursor: "pointer",
              transition: "transform 0.2s",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: "85px",
                height: "auto",
                objectFit: "contain",
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: "26px",
                fontWeight: 700,
                color: theme.palette.primary.contrastText,
                letterSpacing: "-0.5px",
              }}
            >
              AMM DEX
            </Typography>
          </Box>

          {/* Navigation */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Button
              onClick={() => navigate("/swap")}
              startIcon={<SwapHoriz />}
              sx={{
                textTransform: "none",
                color: theme.palette.primary.contrastText,
                fontSize: "16px",
                fontWeight: 500,
                px: 2,
                py: 1,
                borderRadius: "8px",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  transform: "translateY(-2px)",
                },
              }}
            >
              Swap
            </Button>

            <Button
              onClick={() => navigate("/pools")}
              startIcon={<Waves />}
              sx={{
                textTransform: "none",
                color: theme.palette.primary.contrastText,
                fontSize: "16px",
                fontWeight: 500,
                px: 2,
                py: 1,
                borderRadius: "8px",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  transform: "translateY(-2px)",
                },
              }}
            >
              Pools
            </Button>

            <Button
              onClick={() => navigate("/liquidity/add")}
              startIcon={<Add />}
              sx={{
                textTransform: "none",
                color: theme.palette.primary.contrastText,
                fontSize: "16px",
                fontWeight: 500,
                px: 2,
                py: 1,
                borderRadius: "8px",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  transform: "translateY(-2px)",
                },
              }}
            >
              Liquidity
            </Button>
          </Box>

          {/* Wallet Section */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {connected && publicKey ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {/* Connected Wallet Info */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    backgroundColor: theme.palette.action.hover,
                    borderRadius: "12px",
                    px: 2,
                    py: 1,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  {/* Wallet Icon */}
                  <Box
                    sx={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    <img
                      src={getWalletIcon()}
                      alt={getWalletName()}
                      style={{
                        width: "28px",
                        height: "28px",
                        objectFit: "contain",
                      }}
                    />
                  </Box>

                  {/* Wallet Address */}
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: theme.palette.primary.contrastText,
                      fontFamily: "monospace",
                    }}
                  >
                    {shortenAddress(publicKey.toBase58())}
                  </Typography>
                </Box>

                {/* Disconnect Button */}
                <Button
                  onClick={disconnect}
                  variant="outlined"
                  sx={{
                    textTransform: "none",
                    color: theme.palette.error.main,
                    borderColor: theme.palette.error.main,
                    borderRadius: "8px",
                    px: 2,
                    py: 0.75,
                    fontSize: "14px",
                    fontWeight: 500,
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: theme.palette.error.dark,
                      backgroundColor: theme.palette.error.light,
                      color: theme.palette.error.dark,
                    },
                  }}
                >
                  Disconnect
                </Button>
              </Box>
            ) : (
              // Connect Wallet Button
              <Box
                sx={{
                  "& .wallet-adapter-button": {
                    backgroundColor: `${theme.palette.secondary.main} !important`,
                    borderRadius: "8px !important",
                    padding: "10px 24px !important",
                    fontSize: "14px !important",
                    fontWeight: "600 !important",
                    color: `${theme.palette.secondary.contrastText} !important`,
                    height: "42px !important",
                    transition: "all 0.2s !important",
                    border: `1px solid ${theme.palette.divider} !important`,
                  },
                  "& .wallet-adapter-button:hover": {
                    backgroundColor: `${theme.palette.action.hover} !important`,
                    transform: "translateY(-2px) !important",
                  },
                }}
              >
                <WalletMultiButton />
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        id="detail"
        sx={{
          flex: "1 1 auto",
          width: "100%",
          overflow: "auto",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}