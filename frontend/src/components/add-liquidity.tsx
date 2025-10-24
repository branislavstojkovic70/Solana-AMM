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
  InputLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { Add, Info } from "@mui/icons-material";
import { ContractService } from "../services/contract-service";
import { TOKEN_LIST } from "../utils/constants";

export default function AddLiquidity() {
  const theme = useTheme();
  const { connection } = useConnection();
  const wallet = useWallet();

  // Selected tokens
  const [selectedTokenA, setSelectedTokenA] = useState<string>("");
  const [selectedTokenB, setSelectedTokenB] = useState<string>("");

  // Form inputs
  const [amountADesired, setAmountADesired] = useState("");
  const [amountBDesired, setAmountBDesired] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  
  // State
  const [loading, setLoading] = useState(false);
  const [loadingPool, setLoadingPool] = useState(false);
  const [error, setError] = useState("");
  
  // Pool data
  const [poolExists, setPoolExists] = useState(false);
  const [poolData, setPoolData] = useState<any>(null);
  
  // Balances
  const [balanceA, setBalanceA] = useState<string>("0");
  const [balanceB, setBalanceB] = useState<string>("0");
  
  // Calculated values
  const [calculatedAmounts, setCalculatedAmounts] = useState<{
    amountA: string;
    amountB: string;
    lpTokens: string;
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

  // Fetch balances
  const fetchBalances = async () => {
    if (!wallet.publicKey || !selectedTokenA || !selectedTokenB) return;

    try {
      const contractService = new ContractService(connection, wallet);
      const mintA = new PublicKey(selectedTokenA);
      const mintB = new PublicKey(selectedTokenB);

      const tokenA = getTokenByMint(selectedTokenA);
      const tokenB = getTokenByMint(selectedTokenB);

      const balA = await contractService.getTokenBalance(mintA);
      const balB = await contractService.getTokenBalance(mintB);

      if (balA) {
        setBalanceA((Number(balA.balance) / Math.pow(10, tokenA?.decimals || 9)).toFixed(4));
      } else {
        setBalanceA("0");
      }
      
      if (balB) {
        setBalanceB((Number(balB.balance) / Math.pow(10, tokenB?.decimals || 9)).toFixed(4));
      } else {
        setBalanceB("0");
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
      setBalanceA("0");
      setBalanceB("0");
    }
  };

  // Calculate optimal amounts
  const calculateOptimalAmounts = () => {
    if (!poolData || !amountADesired || !amountBDesired) {
      setCalculatedAmounts(null);
      return;
    }

    const desiredA = parseFloat(amountADesired);
    const desiredB = parseFloat(amountBDesired);

    if (desiredA <= 0 || desiredB <= 0) {
      setCalculatedAmounts(null);
      return;
    }

    try {
      const contractService = new ContractService(connection, wallet);
      const tokenA = getTokenByMint(selectedTokenA);
      const tokenB = getTokenByMint(selectedTokenB);
      
      const quote = contractService.calculateAddLiquidity(
        BigInt(Math.floor(desiredA * Math.pow(10, tokenA?.decimals || 9))),
        BigInt(Math.floor(desiredB * Math.pow(10, tokenB?.decimals || 9))),
        poolData.reserveA,
        poolData.reserveB,
        poolData.totalSupply
      );

      const decimalsA = tokenA?.decimals || 9;
      const decimalsB = tokenB?.decimals || 9;

      setCalculatedAmounts({
        amountA: (Number(quote.amountA) / Math.pow(10, decimalsA)).toFixed(6),
        amountB: (Number(quote.amountB) / Math.pow(10, decimalsB)).toFixed(6),
        lpTokens: (Number(quote.lpTokens) / 1e9).toFixed(6),
        shareOfPool: quote.shareOfPool.toFixed(4),
      });
    } catch (err) {
      console.error("Error calculating amounts:", err);
      setCalculatedAmounts(null);
    }
  };

  // Handle add liquidity
  const handleAddLiquidity = async () => {
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
      setError("Pool does not exist. Create it first.");
      return;
    }

    if (!amountADesired || !amountBDesired || 
        parseFloat(amountADesired) <= 0 || parseFloat(amountBDesired) <= 0) {
      setError("Please enter valid desired amounts");
      return;
    }

    if (!calculatedAmounts) {
      setError("Unable to calculate optimal amounts");
      return;
    }

    if (parseFloat(calculatedAmounts.amountA) > parseFloat(balanceA)) {
      setError(`Insufficient balance for Token A. Need: ${calculatedAmounts.amountA}, Have: ${balanceA}`);
      return;
    }

    if (parseFloat(calculatedAmounts.amountB) > parseFloat(balanceB)) {
      setError(`Insufficient balance for Token B. Need: ${calculatedAmounts.amountB}, Have: ${balanceB}`);
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

      const amountADesiredBigInt = BigInt(Math.floor(parseFloat(amountADesired) * Math.pow(10, decimalsA)));
      const amountBDesiredBigInt = BigInt(Math.floor(parseFloat(amountBDesired) * Math.pow(10, decimalsB)));
      
      const amountAMin = BigInt(Math.floor(parseFloat(calculatedAmounts.amountA) * slippageFactor * Math.pow(10, decimalsA)));
      const amountBMin = BigInt(Math.floor(parseFloat(calculatedAmounts.amountB) * slippageFactor * Math.pow(10, decimalsB)));
      const minLpTokens = BigInt(Math.floor(parseFloat(calculatedAmounts.lpTokens) * slippageFactor * 1e9));

      toast.loading("Adding liquidity...", { id: "add-liquidity" });

      const tx = await contractService.addLiquidity(
        mintA,
        mintB,
        amountADesiredBigInt,
        amountBDesiredBigInt,
        amountAMin,
        amountBMin,
        minLpTokens
      );

      toast.success(`Liquidity added! TX: ${tx.slice(0, 8)}...`, {
        id: "add-liquidity",
      });

      setAmountADesired("");
      setAmountBDesired("");
      setCalculatedAmounts(null);

      await fetchPoolData();
      await fetchBalances();
    } catch (err: any) {
      console.error("Add liquidity error:", err);
      
      let errorMessage = "Failed to add liquidity";
      
      if (err.message?.includes("InsufficientAmountA")) {
        errorMessage = "Insufficient amount A after slippage calculation";
      } else if (err.message?.includes("InsufficientAmountB")) {
        errorMessage = "Insufficient amount B after slippage calculation";
      } else if (err.message?.includes("InsufficientBalance")) {
        errorMessage = "Insufficient token balance";
      } else if (err.message?.includes("InsufficientLPTokens")) {
        errorMessage = "LP tokens received would be below minimum";
      }
      
      toast.error(errorMessage, { id: "add-liquidity" });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchPoolData();
    fetchBalances();
  }, [selectedTokenA, selectedTokenB, wallet.publicKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateOptimalAmounts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [amountADesired, amountBDesired, poolData]);

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
              color: theme.palette.primary.main,
              marginBottom: 1,
            }}
          >
            Add Liquidity
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
            }}
          >
            Deposit tokens to earn trading fees
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
                    <img src={token.logo} alt={token.symbol} style={{ width: 24, height: 24, borderRadius: "50%" }} />
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
                    <img src={token.logo} alt={token.symbol} style={{ width: 24, height: 24, borderRadius: "50%" }} />
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
          <Alert severity="success" icon={<Info />} sx={{ marginBottom: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 0.5 }}>
              Pool Found!
            </Typography>
            <Typography variant="caption" sx={{ display: "block" }}>
              Reserve A: {(Number(poolData.reserveA) / Math.pow(10, getTokenByMint(selectedTokenA)?.decimals || 9)).toFixed(4)}
            </Typography>
            <Typography variant="caption" sx={{ display: "block" }}>
              Reserve B: {(Number(poolData.reserveB) / Math.pow(10, getTokenByMint(selectedTokenB)?.decimals || 9)).toFixed(4)}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", marginTop: 0.5, fontWeight: 600 }}>
              Current Ratio: 1 {getTokenByMint(selectedTokenA)?.symbol} ={" "}
              {(Number(poolData.reserveB) / Number(poolData.reserveA)).toFixed(6)} {getTokenByMint(selectedTokenB)?.symbol}
            </Typography>
          </Alert>
        ) : selectedTokenA && selectedTokenB ? (
          <Alert severity="warning" sx={{ marginBottom: 3 }}>
            Pool does not exist. Please create it first.
          </Alert>
        ) : null}

        {/* Amount Inputs */}
        {poolExists && (
          <>
            <Alert severity="info" icon={<Info />} sx={{ marginBottom: 3 }}>
              <Typography variant="caption">
                💡 <strong>How it works:</strong> Enter your desired amounts. The contract will calculate the optimal amounts that maintain the pool ratio.
              </Typography>
            </Alert>

            {/* Token A Amount */}
            <Box sx={{ marginBottom: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  {getTokenByMint(selectedTokenA)?.symbol} Amount (Desired)
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                  }}
                >
                  Balance: {balanceA}
                </Typography>
              </Box>
              <TextField
                fullWidth
                type="number"
                placeholder="0.00"
                value={amountADesired}
                onChange={(e) => setAmountADesired(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => setAmountADesired(balanceA)}
                        sx={{
                          minWidth: "auto",
                          padding: "4px 8px",
                          fontSize: "12px",
                          textTransform: "none",
                        }}
                      >
                        MAX
                      </Button>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              />
            </Box>

            {/* Plus Icon */}
            <Box sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
              <Box
                sx={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: theme.palette.primary.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Add sx={{ color: theme.palette.primary.contrastText }} />
              </Box>
            </Box>

            {/* Token B Amount */}
            <Box sx={{ marginBottom: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  {getTokenByMint(selectedTokenB)?.symbol} Amount (Desired)
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                  }}
                >
                  Balance: {balanceB}
                </Typography>
              </Box>
              <TextField
                fullWidth
                type="number"
                placeholder="0.00"
                value={amountBDesired}
                onChange={(e) => setAmountBDesired(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => setAmountBDesired(balanceB)}
                        sx={{
                          minWidth: "auto",
                          padding: "4px 8px",
                          fontSize: "12px",
                          textTransform: "none",
                        }}
                      >
                        MAX
                      </Button>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              />
            </Box>

            {/* Calculated Amounts */}
            {calculatedAmounts && (
              <Box
                sx={{
                  padding: 2,
                  borderRadius: "12px",
                  backgroundColor: theme.palette.primary.main,
                  marginBottom: 3,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    marginBottom: 1.5,
                    color: theme.palette.primary.contrastText,
                  }}
                >
                  📊 Contract Will Use (Optimal Amounts)
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 0.5 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
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
                  <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
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
                  <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
                    LP Tokens:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.contrastText }}>
                    {calculatedAmounts.lpTokens}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
                    Pool Share:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.contrastText }}>
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
              onClick={handleAddLiquidity}
              disabled={loading || !wallet.publicKey || !calculatedAmounts}
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
              {loading ? <CircularProgress size={24} /> : !wallet.publicKey ? "Connect Wallet" : "Add Liquidity"}
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
          💡 The contract calculates optimal amounts to maintain pool ratio
        </Typography>
      </Paper>
    </Box>
  );
}