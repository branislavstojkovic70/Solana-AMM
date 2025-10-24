import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Slider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { Remove, Info } from "@mui/icons-material";
import { ContractService } from "../services/contract-service";
import { TOKEN_LIST } from "../utils/constants";
export default function RemoveLiquidity() {
  const theme = useTheme();
  const { connection } = useConnection();
  const wallet = useWallet();

  // Selected tokens
  const [selectedTokenA, setSelectedTokenA] = useState<string>("");
  const [selectedTokenB, setSelectedTokenB] = useState<string>("");

  // Form inputs
  const [removePercentage, setRemovePercentage] = useState<number>(50);
  const [slippage, setSlippage] = useState("0.5");
  
  // State
  const [loading, setLoading] = useState(false);
  const [loadingPool, setLoadingPool] = useState(false);
  const [error, setError] = useState("");
  
  // Pool data
  const [poolExists, setPoolExists] = useState(false);
  const [poolData, setPoolData] = useState<any>(null);
  
  // LP Balance
  const [lpBalance, setLpBalance] = useState<string>("0");
  
  // Calculated values
  const [calculatedAmounts, setCalculatedAmounts] = useState<{
    lpTokensToRemove: string;
    amountA: string;
    amountB: string;
    shareOfPool: string;
  } | null>(null);

  // Get token by mint
  const getTokenByMint = (mint: string) => {
    return TOKEN_LIST.find((t) => t.mint === mint);
  };

  // Fetch pool data
  const fetchPoolData = async () => {
    if (!selectedTokenA || !selectedTokenB) return;

    try {
      setLoadingPool(true);
      setError("");

      const contractService = new ContractService(connection, wallet);
      const mintA = new PublicKey(selectedTokenA);
      const mintB = new PublicKey(selectedTokenB);

      const pool = await contractService.getPool(mintA, mintB);

      if (pool) {
        setPoolExists(true);
        setPoolData(pool);
      } else {
        setPoolExists(false);
        setPoolData(null);
        setError("Pool does not exist for these tokens");
      }
    } catch (err: any) {
      console.error("Error fetching pool:", err);
      setPoolExists(false);
      setPoolData(null);
    } finally {
      setLoadingPool(false);
    }
  };

  // Fetch LP token balance
  const fetchLPBalance = async () => {
    if (!wallet.publicKey || !selectedTokenA || !selectedTokenB) return;

    try {
      const contractService = new ContractService(connection, wallet);
      const mintA = new PublicKey(selectedTokenA);
      const mintB = new PublicKey(selectedTokenB);

      const balance = await contractService.getLPTokenBalance(mintA, mintB);
      setLpBalance((Number(balance) / 1e9).toFixed(6));
    } catch (err) {
      console.error("Error fetching LP balance:", err);
      setLpBalance("0");
    }
  };

  // Calculate removal amounts
  const calculateRemovalAmounts = () => {
    if (!poolData || !lpBalance || parseFloat(lpBalance) === 0) {
      setCalculatedAmounts(null);
      return;
    }

    try {
      const contractService = new ContractService(connection, wallet);
      
      const lpTokensToRemove = BigInt(Math.floor(parseFloat(lpBalance) * (removePercentage / 100) * 1e9));

      const quote = contractService.calculateRemoveLiquidity(
        lpTokensToRemove,
        poolData.reserveA,
        poolData.reserveB,
        poolData.totalSupply
      );

      const tokenA = getTokenByMint(selectedTokenA);
      const tokenB = getTokenByMint(selectedTokenB);
      const decimalsA = tokenA?.decimals || 9;
      const decimalsB = tokenB?.decimals || 9;

      setCalculatedAmounts({
        lpTokensToRemove: (Number(lpTokensToRemove) / 1e9).toFixed(6),
        amountA: (Number(quote.amountA) / Math.pow(10, decimalsA)).toFixed(6),
        amountB: (Number(quote.amountB) / Math.pow(10, decimalsB)).toFixed(6),
        shareOfPool: quote.shareOfPool.toFixed(4),
      });
    } catch (err) {
      console.error("Error calculating removal:", err);
      setCalculatedAmounts(null);
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async () => {
    setError("");

    if (!wallet.publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    if (!selectedTokenA || !selectedTokenB) {
      setError("Please select both tokens");
      return;
    }

    if (!poolExists) {
      setError("Pool does not exist");
      return;
    }

    if (parseFloat(lpBalance) === 0) {
      setError("You have no LP tokens for this pool");
      return;
    }

    if (!calculatedAmounts) {
      setError("Unable to calculate removal amounts");
      return;
    }

    try {
      setLoading(true);

      const contractService = new ContractService(connection, wallet);
      const mintA = new PublicKey(selectedTokenA);
      const mintB = new PublicKey(selectedTokenB);
      const tokenA = getTokenByMint(selectedTokenA);
      const tokenB = getTokenByMint(selectedTokenB);

      const slippageFactor = 1 - parseFloat(slippage) / 100;
      
      const decimalsA = tokenA?.decimals || 9;
      const decimalsB = tokenB?.decimals || 9;

      const lpTokensToRemove = BigInt(Math.floor(parseFloat(calculatedAmounts.lpTokensToRemove) * 1e9));
      const minAmountA = BigInt(Math.floor(parseFloat(calculatedAmounts.amountA) * slippageFactor * Math.pow(10, decimalsA)));
      const minAmountB = BigInt(Math.floor(parseFloat(calculatedAmounts.amountB) * slippageFactor * Math.pow(10, decimalsB)));

      toast.loading("Removing liquidity...", { id: "remove-liquidity" });

      const tx = await contractService.removeLiquidity(
        mintA,
        mintB,
        lpTokensToRemove,
        minAmountA,
        minAmountB
      );

      toast.success(`Liquidity removed! TX: ${tx.slice(0, 8)}...`, {
        id: "remove-liquidity",
      });

      setRemovePercentage(50);
      setCalculatedAmounts(null);

      await fetchPoolData();
      await fetchLPBalance();
    } catch (err: any) {
      console.error("Remove liquidity error:", err);
      
      let errorMessage = "Failed to remove liquidity";
      
      if (err.message?.includes("InsufficientLiquidity")) {
        errorMessage = "Insufficient liquidity in the pool";
      } else if (err.message?.includes("SlippageExceeded")) {
        errorMessage = "Slippage tolerance exceeded";
      }
      
      toast.error(errorMessage, { id: "remove-liquidity" });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchPoolData();
    fetchLPBalance();
  }, [selectedTokenA, selectedTokenB, wallet.publicKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateRemovalAmounts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [removePercentage, lpBalance, poolData]);

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 70px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 3,
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: "600px",
          width: "100%",
          padding: 4,
          borderRadius: "16px",
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header */}
        <Box sx={{ marginBottom: 3, textAlign: "center" }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: theme.palette.error.main,
              marginBottom: 1,
            }}
          >
            Remove Liquidity
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
            }}
          >
            Withdraw your tokens from the pool
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{ marginBottom: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* Token A Selector */}
        <Box sx={{ marginBottom: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              marginBottom: 1,
              color: theme.palette.text.primary,
            }}
          >
            Select Token A
          </Typography>
          <FormControl fullWidth>
            <Select
              value={selectedTokenA}
              onChange={(e) => setSelectedTokenA(e.target.value)}
              displayEmpty
              sx={{
                borderRadius: "8px",
                backgroundColor: theme.palette.action.hover,
              }}
            >
              <MenuItem value="" disabled>
                Choose a token
              </MenuItem>
              {TOKEN_LIST.filter((token) => token.mint !== selectedTokenB).map((token) => (
                <MenuItem key={token.mint} value={token.mint}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <img 
                      src={token.logo} 
                      alt={token.symbol} 
                      style={{ width: 24, height: 24, borderRadius: "50%" }} 
                      onError={(e) => {
                        e.currentTarget.src = "/logo.png";
                      }}
                    />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {token.symbol}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {token.name}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Token B Selector */}
        <Box sx={{ marginBottom: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              marginBottom: 1,
              color: theme.palette.text.primary,
            }}
          >
            Select Token B
          </Typography>
          <FormControl fullWidth>
            <Select
              value={selectedTokenB}
              onChange={(e) => setSelectedTokenB(e.target.value)}
              displayEmpty
              sx={{
                borderRadius: "8px",
                backgroundColor: theme.palette.action.hover,
              }}
            >
              <MenuItem value="" disabled>
                Choose a token
              </MenuItem>
              {TOKEN_LIST.filter((token) => token.mint !== selectedTokenA).map((token) => (
                <MenuItem key={token.mint} value={token.mint}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <img 
                      src={token.logo} 
                      alt={token.symbol} 
                      style={{ width: 24, height: 24, borderRadius: "50%" }} 
                      onError={(e) => {
                        e.currentTarget.src = "/logo.png";
                      }}
                    />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {token.symbol}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {token.name}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Pool Status */}
        {loadingPool ? (
          <Box sx={{ textAlign: "center", marginBottom: 3 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ marginTop: 1 }}>
              Loading pool data...
            </Typography>
          </Box>
        ) : poolExists && poolData ? (
          <>
            <Alert severity="info" icon={<Info />} sx={{ marginBottom: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 0.5 }}>
                Your LP Position
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                LP Tokens: {lpBalance}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                Reserve A: {(Number(poolData.reserveA) / Math.pow(10, getTokenByMint(selectedTokenA)?.decimals || 9)).toFixed(4)}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                Reserve B: {(Number(poolData.reserveB) / Math.pow(10, getTokenByMint(selectedTokenB)?.decimals || 9)).toFixed(4)}
              </Typography>
            </Alert>

            {parseFloat(lpBalance) === 0 ? (
              <Alert severity="warning" sx={{ marginBottom: 3 }}>
                You have no LP tokens for this pool
              </Alert>
            ) : null}
          </>
        ) : selectedTokenA && selectedTokenB ? (
          <Alert severity="warning" sx={{ marginBottom: 3 }}>
            Pool does not exist
          </Alert>
        ) : null}

        {/* Remove Percentage Slider */}
        {poolExists && parseFloat(lpBalance) > 0 && (
          <>
            <Box sx={{ marginBottom: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  Amount to Remove
                </Typography>
                <Chip
                  label={`${removePercentage}%`}
                  sx={{
                    backgroundColor: theme.palette.error.main,
                    color: theme.palette.error.contrastText,
                    fontWeight: 700,
                  }}
                />
              </Box>

              <Slider
                value={removePercentage}
                onChange={(_, value) => setRemovePercentage(value as number)}
                min={1}
                max={100}
                step={1}
                marks={[
                  { value: 25, label: "25%" },
                  { value: 50, label: "50%" },
                  { value: 75, label: "75%" },
                  { value: 100, label: "MAX" },
                ]}
                sx={{
                  color: theme.palette.error.main,
                  "& .MuiSlider-thumb": {
                    width: 20,
                    height: 20,
                  },
                  "& .MuiSlider-markLabel": {
                    fontSize: "12px",
                  },
                }}
              />

              <Box sx={{ display: "flex", gap: 1, marginTop: 2 }}>
                {[25, 50, 75, 100].map((value) => (
                  <Button
                    key={value}
                    variant={removePercentage === value ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setRemovePercentage(value)}
                    sx={{
                      flex: 1,
                      textTransform: "none",
                      borderColor: theme.palette.error.main,
                      color: removePercentage === value ? theme.palette.error.contrastText : theme.palette.error.main,
                      backgroundColor: removePercentage === value ? theme.palette.error.main : "transparent",
                      "&:hover": {
                        borderColor: theme.palette.error.dark,
                        backgroundColor: removePercentage === value ? theme.palette.error.dark : theme.palette.error.light,
                      },
                    }}
                  >
                    {value === 100 ? "MAX" : `${value}%`}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Icon */}
            <Box sx={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>
              <Box
                sx={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: theme.palette.error.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Remove sx={{ color: theme.palette.error.contrastText }} />
              </Box>
            </Box>

            {/* Calculated Amounts */}
            {calculatedAmounts && (
              <Box
                sx={{
                  padding: 2,
                  borderRadius: "12px",
                  backgroundColor: theme.palette.error.main,
                  marginBottom: 3,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    marginBottom: 1.5,
                    color: theme.palette.error.contrastText,
                  }}
                >
                  📊 You Will Receive
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.error.contrastText }}>
                    {getTokenByMint(selectedTokenA)?.symbol}:
                  </Typography>
                  <Chip
                    label={calculatedAmounts.amountA}
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.error.contrastText }}>
                    {getTokenByMint(selectedTokenB)?.symbol}:
                  </Typography>
                  <Chip
                    label={calculatedAmounts.amountB}
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Divider sx={{ marginY: 1.5, borderColor: "rgba(255,255,255,0.2)" }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.error.contrastText }}>
                    LP Tokens Burned:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.error.contrastText }}>
                    {calculatedAmounts.lpTokensToRemove}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: theme.palette.error.contrastText }}>
                    Share Removed:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.error.contrastText }}>
                    {calculatedAmounts.shareOfPool}%
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Slippage */}
            <Box sx={{ marginBottom: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  marginBottom: 1,
                  color: theme.palette.text.primary,
                }}
              >
                Slippage Tolerance (%)
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {["0.1", "0.5", "1.0"].map((value) => (
                  <Button
                    key={value}
                    variant={slippage === value ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setSlippage(value)}
                    sx={{ flex: 1, textTransform: "none" }}
                  >
                    {value}%
                  </Button>
                ))}
                <TextField
                  size="small"
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  sx={{ width: "100px" }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Box>
            </Box>

            {/* Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleRemoveLiquidity}
              disabled={loading || !wallet.publicKey || !calculatedAmounts}
              sx={{
                height: "56px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 700,
                textTransform: "none",
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                boxShadow: `0 4px 20px ${theme.palette.error.main}40`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
                  transform: "translateY(-2px)",
                },
                "&:disabled": {
                  background: theme.palette.action.disabledBackground,
                },
              }}
            >
              {loading ? <CircularProgress size={24} /> : !wallet.publicKey ? "Connect Wallet" : "Remove Liquidity"}
            </Button>
          </>
        )}

        {/* Info */}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            marginTop: 2,
            textAlign: "center",
            color: theme.palette.text.secondary,
          }}
        >
          💡 Removing liquidity will return both tokens proportionally
        </Typography>
      </Paper>
    </Box>
  );
}