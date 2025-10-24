import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  Add,
  Remove,
  SwapHoriz,
  TrendingUp,
  LocalAtm,
  Layers,
} from "@mui/icons-material";
import { ContractService } from "../services/contract-service";
import { TOKEN_LIST } from "../utils/constants";


interface Pool {
  address: string;
  tokenA: {
    mint: string;
    symbol: string;
    logo: string;
    decimals: number;
  };
  tokenB: {
    mint: string;
    symbol: string;
    logo: string;
    decimals: number;
  };
  reserveA: bigint;
  reserveB: bigint;
  totalSupply: bigint;
  feeNumerator: number;
  feeDenominator: number;
  lpBalance?: string;
  shareOfPool?: string;
}

export default function Pools() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get token by mint
  const getTokenByMint = (mint: string) => {
    return TOKEN_LIST.find((t) => t.mint === mint);
  };

  // Fetch all pools
  const fetchAllPools = async () => {
    try {
      setLoading(true);
      setError("");

      const contractService = new ContractService(connection, wallet);
      const allPools: Pool[] = [];

      // Check all possible token pairs
      for (let i = 0; i < TOKEN_LIST.length; i++) {
        for (let j = i + 1; j < TOKEN_LIST.length; j++) {
          const tokenA = TOKEN_LIST[i];
          const tokenB = TOKEN_LIST[j];

          try {
            const mintA = new PublicKey(tokenA.mint);
            const mintB = new PublicKey(tokenB.mint);

            const poolData = await contractService.getPool(mintA, mintB);

            if (poolData) {
              // Get LP balance if wallet is connected
              let lpBalance = "0";
              let shareOfPool = "0";

              if (wallet.publicKey) {
                try {
                  const balance = await contractService.getLPTokenBalance(mintA, mintB);
                  lpBalance = (Number(balance) / 1e9).toFixed(6);

                  if (Number(balance) > 0 && poolData.totalSupply > 0) {
                    shareOfPool = ((Number(balance) / Number(poolData.totalSupply)) * 100).toFixed(4);
                  }
                } catch (err) {
                  console.error("Error fetching LP balance:", err);
                }
              }

              allPools.push({
                //@ts-ignore
                address: poolData.address,
                tokenA: {
                  mint: tokenA.mint,
                  symbol: tokenA.symbol,
                  logo: tokenA.logo,
                  decimals: tokenA.decimals,
                },
                tokenB: {
                  mint: tokenB.mint,
                  symbol: tokenB.symbol,
                  logo: tokenB.logo,
                  decimals: tokenB.decimals,
                },
                reserveA: poolData.reserveA,
                reserveB: poolData.reserveB,
                totalSupply: poolData.totalSupply,
                feeNumerator: poolData.feeNumerator,
                feeDenominator: poolData.feeDenominator,
                lpBalance,
                shareOfPool,
              });
            }
          } catch (err) {
            // Pool doesn't exist, skip
            console.log(`No pool for ${tokenA.symbol}-${tokenB.symbol}`);
          }
        }
      }

      setPools(allPools);

      if (allPools.length === 0) {
        setError("No pools found");
      }
    } catch (err: any) {
      console.error("Error fetching pools:", err);
      setError("Failed to load pools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPools();
  }, [wallet.publicKey]);

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 70px)",
        padding: 4,
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          maxWidth: "1400px",
          margin: "0 auto",
          marginBottom: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                marginBottom: 1,
              }}
            >
              Liquidity Pools
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.text.secondary,
              }}
            >
              View all available pools and manage your liquidity
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate("/create-pool")}
            sx={{
              height: "48px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              textTransform: "none",
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              boxShadow: `0 4px 20px ${theme.palette.primary.main}40`,
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: `0 6px 25px ${theme.palette.primary.main}60`,
              },
            }}
          >
            Create Pool
          </Button>
        </Box>

        {/* Stats Bar */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            marginBottom: 3,
          }}
        >
          <Paper
            sx={{
              flex: 1,
              padding: 2,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                backgroundColor: theme.palette.primary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Layers sx={{ color: theme.palette.primary.contrastText }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {pools.length}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Total Pools
              </Typography>
            </Box>
          </Paper>

          <Paper
            sx={{
              flex: 1,
              padding: 2,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                backgroundColor: theme.palette.success.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LocalAtm sx={{ color: theme.palette.success.contrastText }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {pools.filter((p) => parseFloat(p.lpBalance || "0") > 0).length}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Your Positions
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {loading ? (
          <Box sx={{ textAlign: "center", padding: 8 }}>
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ marginTop: 2, color: theme.palette.text.secondary }}>
              Loading pools...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ maxWidth: "600px", margin: "0 auto" }}>
            {error}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {pools.map((pool) => (
              //@ts-ignore
              <Grid item xs={12} sm={6} lg={4} key={pool.address}>
                <PoolCard pool={pool} theme={theme} navigate={navigate} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

// Pool Card Component
function PoolCard({ pool, theme, navigate }: { pool: Pool; theme: any; navigate: any }) {
  const reserveA = (Number(pool.reserveA) / Math.pow(10, pool.tokenA.decimals)).toFixed(2);
  const reserveB = (Number(pool.reserveB) / Math.pow(10, pool.tokenB.decimals)).toFixed(2);
  const feePercentage = ((pool.feeNumerator / pool.feeDenominator) * 100).toFixed(2);
  const hasLiquidity = parseFloat(pool.lpBalance || "0") > 0;

  return (
    <Card
      sx={{
        borderRadius: "16px",
        border: `2px solid ${hasLiquidity ? theme.palette.primary.main : theme.palette.divider}`,
        background: theme.palette.background.paper,
        transition: "all 0.3s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 8px 30px ${theme.palette.primary.main}30`,
        },
      }}
    >
      <CardContent sx={{ padding: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Token Logos */}
            <Box sx={{ position: "relative", width: 56, height: 32 }}>
              <Avatar
                src={pool.tokenA.logo}
                alt={pool.tokenA.symbol}
                sx={{
                  width: 32,
                  height: 32,
                  position: "absolute",
                  left: 0,
                  border: `2px solid ${theme.palette.background.paper}`,
                }}
                onError={(e: any) => {
                  e.currentTarget.src = "/logo.png";
                }}
              />
              <Avatar
                src={pool.tokenB.logo}
                alt={pool.tokenB.symbol}
                sx={{
                  width: 32,
                  height: 32,
                  position: "absolute",
                  left: 24,
                  border: `2px solid ${theme.palette.background.paper}`,
                }}
                onError={(e: any) => {
                  e.currentTarget.src = "/logo.png";
                }}
              />
            </Box>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {pool.tokenA.symbol}/{pool.tokenB.symbol}
              </Typography>
              <Chip
                label={`${feePercentage}% Fee`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                }}
              />
            </Box>
          </Box>

          {hasLiquidity && (
            <Chip
              label="Your Pool"
              size="small"
              sx={{
                backgroundColor: theme.palette.success.main,
                color: theme.palette.success.contrastText,
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        <Divider sx={{ marginBottom: 2 }} />

        {/* Liquidity Info */}
        <Box sx={{ marginBottom: 2 }}>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 600,
              display: "block",
              marginBottom: 1,
            }}
          >
            Pool Liquidity
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {pool.tokenA.symbol}:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {reserveA}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {pool.tokenB.symbol}:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {reserveB}
            </Typography>
          </Box>
        </Box>

        {/* Your Position */}
        {hasLiquidity && (
          <>
            <Divider sx={{ marginBottom: 2 }} />
            <Box
              sx={{
                padding: 1.5,
                borderRadius: "8px",
                backgroundColor: theme.palette.primary.main + "15",
                marginBottom: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 1,
                }}
              >
                Your Position
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  LP Tokens:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {pool.lpBalance}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Pool Share:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: theme.palette.primary.main }}
                >
                  {pool.shareOfPool}%
                </Typography>
              </Box>
            </Box>
          </>
        )}

        {/* Price Ratio */}
        <Box
          sx={{
            padding: 1.5,
            borderRadius: "8px",
            backgroundColor: theme.palette.action.hover,
            marginBottom: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginBottom: 0.5 }}>
            <TrendingUp sx={{ fontSize: 16, color: theme.palette.primary.main }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Current Rate
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            1 {pool.tokenA.symbol} ={" "}
            {(Number(pool.reserveB) / Number(pool.reserveA)).toFixed(6)} {pool.tokenB.symbol}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              // Navigate with pre-filled tokens
              navigate("/liquidity/add", {
                state: {
                  tokenA: pool.tokenA.mint,
                  tokenB: pool.tokenB.mint,
                },
              });
            }}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            Add
          </Button>

          {hasLiquidity && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Remove />}
              onClick={() => {
                navigate("/liquidity/remove", {
                  state: {
                    tokenA: pool.tokenA.mint,
                    tokenB: pool.tokenB.mint,
                  },
                });
              }}
              sx={{
                textTransform: "none",
                borderRadius: "8px",
                fontWeight: 600,
                borderColor: theme.palette.error.main,
                color: theme.palette.error.main,
                "&:hover": {
                  borderColor: theme.palette.error.dark,
                  backgroundColor: theme.palette.error.light,
                },
              }}
            >
              Remove
            </Button>
          )}

          <Button
            fullWidth
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => {
              navigate("/swap", {
                state: {
                  tokenFrom: pool.tokenA.mint,
                  tokenTo: pool.tokenB.mint,
                },
              });
            }}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            Swap
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}