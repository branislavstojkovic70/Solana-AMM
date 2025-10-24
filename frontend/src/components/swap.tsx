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
  MenuItem,
  Select,
  FormControl,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { SwapVert, Info, Settings } from "@mui/icons-material";
import { ContractService } from "../services/contract-service";
import { TOKEN_LIST } from "../utils/constants";

export default function Swap() {
  const theme = useTheme();
  const { connection } = useConnection();
  const wallet = useWallet();

  // Selected tokens
  const [tokenFrom, setTokenFrom] = useState<string>("");
  const [tokenTo, setTokenTo] = useState<string>("");

  // Amounts
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");

  // Settings
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);
  
  // State
  const [loading, setLoading] = useState(false);
  const [loadingPool, setLoadingPool] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState("");
  
  // Pool data
  const [poolExists, setPoolExists] = useState(false);
  const [poolData, setPoolData] = useState<any>(null);
  
  // Balances
  const [balanceFrom, setBalanceFrom] = useState<string>("0");
  const [balanceTo, setBalanceTo] = useState<string>("0");
  
  // Quote
  const [swapQuote, setSwapQuote] = useState<any>(null);

  // Get token by mint
  const getTokenByMint = (mint: string) => {
    return TOKEN_LIST.find((t) => t.mint === mint);
  };

  // Swap tokens (reverse direction)
  const handleSwapTokens = () => {
    const tempToken = tokenFrom;
    const tempAmount = amountFrom;
    const tempBalance = balanceFrom;

    setTokenFrom(tokenTo);
    setTokenTo(tempToken);
    setAmountFrom("");
    setAmountTo("");
    setBalanceFrom(balanceTo);
    setBalanceTo(tempBalance);
    setSwapQuote(null);
  };

  // Fetch pool data
  const fetchPoolData = async () => {
    if (!tokenFrom || !tokenTo) return;

    try {
      setLoadingPool(true);
      setError("");

      const contractService = new ContractService(connection, wallet);
      const mintFrom = new PublicKey(tokenFrom);
      const mintTo = new PublicKey(tokenTo);

      const pool = await contractService.getPool(mintFrom, mintTo);

      if (pool) {
        setPoolExists(true);
        setPoolData(pool);
      } else {
        setPoolExists(false);
        setPoolData(null);
        setError("No liquidity pool exists for this pair");
      }
    } catch (err: any) {
      console.error("Error fetching pool:", err);
      setPoolExists(false);
      setPoolData(null);
    } finally {
      setLoadingPool(false);
    }
  };

  // Fetch balances
  const fetchBalances = async () => {
    if (!wallet.publicKey || !tokenFrom || !tokenTo) return;

    try {
      const contractService = new ContractService(connection, wallet);
      const mintFrom = new PublicKey(tokenFrom);
      const mintTo = new PublicKey(tokenTo);
      const tokenFromData = getTokenByMint(tokenFrom);
      const tokenToData = getTokenByMint(tokenTo);

      const balFrom = await contractService.getTokenBalance(mintFrom);
      const balTo = await contractService.getTokenBalance(mintTo);

      if (balFrom) {
        setBalanceFrom((Number(balFrom.balance) / Math.pow(10, tokenFromData?.decimals || 9)).toFixed(4));
      } else {
        setBalanceFrom("0");
      }
      
      if (balTo) {
        setBalanceTo((Number(balTo.balance) / Math.pow(10, tokenToData?.decimals || 9)).toFixed(4));
      } else {
        setBalanceTo("0");
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
      setBalanceFrom("0");
      setBalanceTo("0");
    }
  };

  // Calculate swap quote
  const calculateSwapQuote = async () => {
    if (!poolData || !amountFrom || parseFloat(amountFrom) <= 0) {
      setSwapQuote(null);
      setAmountTo("");
      return;
    }

    try {
      setLoadingQuote(true);

      const contractService = new ContractService(connection, wallet);
      const tokenFromData = getTokenByMint(tokenFrom);
      const tokenToData = getTokenByMint(tokenTo);

      // Determine if we're swapping A->B or B->A
      const isAToB = tokenFrom === poolData.tokenMintA.toString();

      const reserveIn = isAToB ? poolData.reserveA : poolData.reserveB;
      const reserveOut = isAToB ? poolData.reserveB : poolData.reserveA;

      const amountInBigInt = BigInt(Math.floor(parseFloat(amountFrom) * Math.pow(10, tokenFromData?.decimals || 9)));

      const quote = contractService.calculateSwapOutput(
        amountInBigInt,
        reserveIn,
        reserveOut,
        poolData.feeNumerator,
        poolData.feeDenominator
      );

      const decimalsTo = tokenToData?.decimals || 9;

      setSwapQuote({
        amountIn: parseFloat(amountFrom),
        amountOut: Number(quote.amountOut) / Math.pow(10, decimalsTo),
        minimumReceived: Number(quote.minimumReceived) / Math.pow(10, decimalsTo),
        priceImpact: quote.priceImpact,
        fee: Number(quote.fee) / Math.pow(10, tokenFromData?.decimals || 9),
      });

      setAmountTo((Number(quote.amountOut) / Math.pow(10, decimalsTo)).toFixed(6));
    } catch (err) {
      console.error("Error calculating quote:", err);
      setSwapQuote(null);
      setAmountTo("");
    } finally {
      setLoadingQuote(false);
    }
  };

  // Handle swap
  const handleSwap = async () => {
    setError("");

    if (!wallet.publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    if (!tokenFrom || !tokenTo) {
      setError("Please select both tokens");
      return;
    }

    if (!poolExists) {
      setError("No liquidity pool exists for this pair");
      return;
    }

    if (!amountFrom || parseFloat(amountFrom) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (parseFloat(amountFrom) > parseFloat(balanceFrom)) {
      setError(`Insufficient balance. You have ${balanceFrom} ${getTokenByMint(tokenFrom)?.symbol}`);
      return;
    }

    if (!swapQuote) {
      setError("Unable to calculate swap quote");
      return;
    }

    try {
      setLoading(true);

      const contractService = new ContractService(connection, wallet);
      const mintFrom = new PublicKey(tokenFrom);
      const mintTo = new PublicKey(tokenTo);
      const tokenFromData = getTokenByMint(tokenFrom);
      const tokenToData = getTokenByMint(tokenTo);

      const isAToB = tokenFrom === poolData.tokenMintA.toString();

      const amountInBigInt = BigInt(Math.floor(parseFloat(amountFrom) * Math.pow(10, tokenFromData?.decimals || 9)));
      const minAmountOutBigInt = BigInt(Math.floor(swapQuote.minimumReceived * Math.pow(10, tokenToData?.decimals || 9)));

      toast.loading("Swapping tokens...", { id: "swap" });

      const tx = await contractService.swap(
        mintFrom,
        mintTo,
        amountInBigInt,
        minAmountOutBigInt,
        isAToB
      );

      toast.success(`Swap successful! TX: ${tx.slice(0, 8)}...`, {
        id: "swap",
      });

      setAmountFrom("");
      setAmountTo("");
      setSwapQuote(null);

      await fetchPoolData();
      await fetchBalances();
    } catch (err: any) {
      console.error("Swap error:", err);
      
      let errorMessage = "Swap failed";
      
      if (err.message?.includes("SlippageExceeded")) {
        errorMessage = "Slippage tolerance exceeded. Try increasing slippage.";
      } else if (err.message?.includes("InsufficientLiquidity")) {
        errorMessage = "Insufficient liquidity in the pool";
      } else if (err.message?.includes("InsufficientBalance")) {
        errorMessage = "Insufficient token balance";
      }
      
      toast.error(errorMessage, { id: "swap" });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchPoolData();
    fetchBalances();
  }, [tokenFrom, tokenTo, wallet.publicKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateSwapQuote();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [amountFrom, poolData, tokenFrom, tokenTo]);

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
          maxWidth: "500px",
          width: "100%",
          padding: 4,
          borderRadius: "16px",
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header */}
        <Box sx={{ marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                marginBottom: 0.5,
              }}
            >
              Swap
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
              }}
            >
              Trade tokens instantly
            </Typography>
          </Box>
          <IconButton
            onClick={() => setShowSettings(!showSettings)}
            sx={{
              backgroundColor: theme.palette.action.hover,
              "&:hover": {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* Settings Panel */}
        {showSettings && (
          <Box
            sx={{
              marginBottom: 3,
              padding: 2,
              borderRadius: "8px",
              backgroundColor: theme.palette.action.hover,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                marginBottom: 1,
                color: theme.palette.text.primary,
              }}
            >
              Slippage Tolerance
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
        )}

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

        {/* From Token */}
        <Box
          sx={{
            padding: 2,
            borderRadius: "12px",
            backgroundColor: theme.palette.action.hover,
            border: `1px solid ${theme.palette.divider}`,
            marginBottom: 1,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              From
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Balance: {balanceFrom}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountFrom}
              onChange={(e) => setAmountFrom(e.target.value)}
              InputProps={{
                disableUnderline: true,
                endAdornment: (
                  <Button
                    size="small"
                    onClick={() => setAmountFrom(balanceFrom)}
                    sx={{
                      minWidth: "auto",
                      padding: "4px 8px",
                      fontSize: "12px",
                      textTransform: "none",
                    }}
                  >
                    MAX
                  </Button>
                ),
              }}
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: "24px",
                  fontWeight: 600,
                },
                "& fieldset": {
                  border: "none",
                },
              }}
            />

            <FormControl sx={{ minWidth: 140 }}>
              <Select
                value={tokenFrom}
                onChange={(e) => setTokenFrom(e.target.value)}
                displayEmpty
                sx={{
                  borderRadius: "8px",
                  "& fieldset": {
                    border: "none",
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select
                </MenuItem>
                {TOKEN_LIST.filter((token) => token.mint !== tokenTo).map((token) => (
                  <MenuItem key={token.mint} value={token.mint}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        style={{ width: 20, height: 20, borderRadius: "50%" }}
                        onError={(e) => {
                          e.currentTarget.src = "/logo.png";
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {token.symbol}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Swap Icon */}
        <Box sx={{ display: "flex", justifyContent: "center", marginY: 1 }}>
          <IconButton
            onClick={handleSwapTokens}
            disabled={!tokenFrom || !tokenTo}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
                transform: "rotate(180deg)",
              },
              transition: "all 0.3s",
            }}
          >
            <SwapVert />
          </IconButton>
        </Box>

        {/* To Token */}
        <Box
          sx={{
            padding: 2,
            borderRadius: "12px",
            backgroundColor: theme.palette.action.hover,
            border: `1px solid ${theme.palette.divider}`,
            marginBottom: 3,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              To
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Balance: {balanceTo}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountTo}
              disabled
              InputProps={{
                disableUnderline: true,
              }}
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: "24px",
                  fontWeight: 600,
                },
                "& fieldset": {
                  border: "none",
                },
                "& .Mui-disabled": {
                  WebkitTextFillColor: theme.palette.text.primary,
                },
              }}
            />

            <FormControl sx={{ minWidth: 140 }}>
              <Select
                value={tokenTo}
                onChange={(e) => setTokenTo(e.target.value)}
                displayEmpty
                sx={{
                  borderRadius: "8px",
                  "& fieldset": {
                    border: "none",
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select
                </MenuItem>
                {TOKEN_LIST.filter((token) => token.mint !== tokenFrom).map((token) => (
                  <MenuItem key={token.mint} value={token.mint}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        style={{ width: 20, height: 20, borderRadius: "50%" }}
                        onError={(e) => {
                          e.currentTarget.src = "/logo.png";
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {token.symbol}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loadingQuote && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginTop: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption">Fetching best price...</Typography>
            </Box>
          )}
        </Box>

        {/* Pool Status */}
        {loadingPool ? (
          <Box sx={{ textAlign: "center", marginBottom: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : !poolExists && tokenFrom && tokenTo ? (
          <Alert severity="warning" sx={{ marginBottom: 3 }}>
            No liquidity pool exists for this pair
          </Alert>
        ) : null}

        {/* Swap Details */}
        {swapQuote && poolExists && (
          <Box
            sx={{
              padding: 2,
              borderRadius: "8px",
              backgroundColor: theme.palette.action.hover,
              border: `1px solid ${theme.palette.divider}`,
              marginBottom: 3,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Rate:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                1 {getTokenByMint(tokenFrom)?.symbol} ≈{" "}
                {(swapQuote.amountOut / swapQuote.amountIn).toFixed(6)} {getTokenByMint(tokenTo)?.symbol}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Price Impact:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: swapQuote.priceImpact > 5 ? theme.palette.error.main : theme.palette.success.main,
                }}
              >
                {swapQuote.priceImpact.toFixed(2)}%
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Fee:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {swapQuote.fee.toFixed(6)} {getTokenByMint(tokenFrom)?.symbol}
              </Typography>
            </Box>
            <Divider sx={{ marginY: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Minimum Received:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {swapQuote.minimumReceived.toFixed(6)} {getTokenByMint(tokenTo)?.symbol}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Price Impact Warning */}
        {swapQuote && swapQuote.priceImpact > 5 && (
          <Alert severity="warning" sx={{ marginBottom: 3 }}>
            High price impact! Consider reducing the swap amount.
          </Alert>
        )}

        {/* Swap Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSwap}
          disabled={loading || !wallet.publicKey || !swapQuote || !poolExists}
          sx={{
            height: "56px",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: 700,
            textTransform: "none",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
            boxShadow: `0 4px 20px ${theme.palette.primary.main}40`,
            "&:hover": {
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
              transform: "translateY(-2px)",
            },
            "&:disabled": {
              background: theme.palette.action.disabledBackground,
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : !wallet.publicKey ? (
            "Connect Wallet"
          ) : !poolExists ? (
            "No Pool Available"
          ) : (
            "Swap"
          )}
        </Button>
      </Paper>
    </Box>
  );
}