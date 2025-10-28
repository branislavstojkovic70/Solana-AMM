import { Box, Typography, Button, Container, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TrendingUp, SwapHoriz, AccountBalanceWallet } from "@mui/icons-material";

export default function HomePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { connected } = useWallet();

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 70px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Animation */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: `radial-gradient(circle at 20% 50%, ${theme.palette.primary.main} 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, ${theme.palette.secondary.main} 0%, transparent 50%)`,
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            textAlign: "center",
            padding: { xs: 3, md: 6 },
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              marginBottom: 4,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: { xs: 200, md: 280 },
                height: { xs: 200, md: 280 },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse 3s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": {
                    transform: "scale(1)",
                    filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.1))",
                  },
                  "50%": {
                    transform: "scale(1.05)",
                    filter: "drop-shadow(0 25px 50px rgba(0, 0, 0, 0.15))",
                  },
                },
              }}
            >
              <img
                src="/logo.png"
                alt="Solana AMM Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "2.5rem", md: "4rem" },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 2,
            }}
          >
            Solana AMM
          </Typography>

          {/* Slogan */}
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 400,
              marginBottom: 1,
              fontSize: { xs: "1.2rem", md: "1.5rem" },
            }}
          >
            Decentralized Trading Made Simple
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              marginBottom: 5,
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            Swap tokens, provide liquidity, and earn rewards on Solana's fastest AMM
          </Typography>

          {/* CTA Buttons */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 6,
              marginTop:3,
            }}
          >
            {connected ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate("/swap")}
                  startIcon={<SwapHoriz />}
                  sx={{
                    height: "56px",
                    paddingX: 4,
                    borderRadius: "12px",
                    fontSize: "18px",
                    fontWeight: 700,
                    textTransform: "none",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                    boxShadow: `0 4px 20px ${theme.palette.primary.main}40`,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: `0 6px 25px ${theme.palette.primary.main}60`,
                    },
                  }}
                >
                  Start Trading
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate("/pools")}
                  startIcon={<TrendingUp />}
                  sx={{
                    height: "56px",
                    paddingX: 4,
                    borderRadius: "12px",
                    fontSize: "18px",
                    fontWeight: 700,
                    textTransform: "none",
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  View Pools
                </Button>
              </>
            ) : (
              <Box
                sx={{
                  "& .wallet-adapter-button": {
                    height: "56px !important",
                    paddingX: "32px !important",
                    borderRadius: "12px !important",
                    fontSize: "18px !important",
                    fontWeight: "700 !important",
                    textTransform: "none !important",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%) !important`,
                    boxShadow: `0 4px 20px ${theme.palette.primary.main}40 !important`,
                    "&:hover": {
                      transform: "translateY(-2px) !important",
                      boxShadow: `0 6px 25px ${theme.palette.primary.main}60 !important`,
                    },
                  },
                }}
              >
                <WalletMultiButton />
              </Box>
            )}
          </Box>

          {/* Feature Cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 3,
              marginTop: 8,
            }}
          >
            <Paper
              elevation={2}
              sx={{
                padding: 4,
                borderRadius: "16px",
                textAlign: "center",
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: `0 12px 40px ${theme.palette.primary.main}20`,
                },
              }}
            >
              <SwapHoriz
                sx={{
                  fontSize: 48,
                  color: theme.palette.primary.main,
                  marginBottom: 2,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 1 }}>
                Instant Swaps
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Trade any token instantly with minimal slippage and low fees
              </Typography>
            </Paper>

            <Paper
              elevation={2}
              sx={{
                padding: 4,
                borderRadius: "16px",
                textAlign: "center",
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: `0 12px 40px ${theme.palette.primary.main}20`,
                },
              }}
            >
              <TrendingUp
                sx={{
                  fontSize: 48,
                  color: theme.palette.success.main,
                  marginBottom: 2,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 1 }}>
                Earn Rewards
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Provide liquidity and earn trading fees from every swap
              </Typography>
            </Paper>

            <Paper
              elevation={2}
              sx={{
                padding: 4,
                borderRadius: "16px",
                textAlign: "center",
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: `0 12px 40px ${theme.palette.primary.main}20`,
                },
              }}
            >
              <AccountBalanceWallet
                sx={{
                  fontSize: 48,
                  color: theme.palette.secondary.main,
                  marginBottom: 2,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 1 }}>
                Full Control
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Non-custodial protocol - you always control your assets
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}