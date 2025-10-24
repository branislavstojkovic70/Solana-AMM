import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { ContractService } from "../services/contract-service";

export default function CreatePool() {
  const theme = useTheme();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [tokenMintA, setTokenMintA] = useState("");
  const [tokenMintB, setTokenMintB] = useState("");
  const [feeNumerator, setFeeNumerator] = useState("3");
  const [feeDenominator, setFeeDenominator] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validate public key
  const isValidPublicKey = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  // Calculate fee percentage
  const calculateFeePercentage = (): string => {
    const num = parseFloat(feeNumerator);
    const denom = parseFloat(feeDenominator);
    if (denom === 0) return "0";
    return ((num / denom) * 100).toFixed(2);
  };

  // Handle pool creation
  const handleCreatePool = async () => {
    setError("");

    // Validation
    if (!wallet.publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    if (!tokenMintA || !tokenMintB) {
      setError("Please enter both token mint addresses");
      return;
    }

    if (!isValidPublicKey(tokenMintA)) {
      setError("Invalid Token A mint address");
      return;
    }

    if (!isValidPublicKey(tokenMintB)) {
      setError("Invalid Token B mint address");
      return;
    }

    if (tokenMintA === tokenMintB) {
      setError("Token mints must be different");
      return;
    }

    const feeNum = parseFloat(feeNumerator);
    const feeDenom = parseFloat(feeDenominator);

    if (isNaN(feeNum) || isNaN(feeDenom) || feeNum < 0 || feeDenom <= 0) {
      setError("Invalid fee parameters");
      return;
    }

    if (feeNum > feeDenom) {
      setError("Fee numerator cannot exceed denominator");
      return;
    }

    try {
      setLoading(true);

      const contractService = new ContractService(connection, wallet);

      const mintA = new PublicKey(tokenMintA);
      const mintB = new PublicKey(tokenMintB);

      // Check if pool already exists
      const poolExists = await contractService.poolExists(mintA, mintB);
      if (poolExists) {
        setError("Pool already exists for these tokens");
        setLoading(false);
        return;
      }

      toast.loading("Creating pool...", { id: "create-pool" });

      const tx = await contractService.initializePool(
        mintA,
        mintB,
        Math.floor(feeNum),
        Math.floor(feeDenom)
      );

      toast.success(`Pool created successfully! TX: ${tx.slice(0, 8)}...`, {
        id: "create-pool",
      });

      // Reset form
      setTokenMintA("");
      setTokenMintB("");
      setFeeNumerator("3");
      setFeeDenominator("1000");
    } catch (err: any) {
      console.error("Pool creation error:", err);
      toast.error(err.message || "Failed to create pool", {
        id: "create-pool",
      });
      setError(err.message || "Failed to create pool");
    } finally {
      setLoading(false);
    }
  };

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
            Create Liquidity Pool
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
            }}
          >
            Initialize a new AMM pool for token pair
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

        {/* Token Mint A */}
        <Box sx={{ marginBottom: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              marginBottom: 1,
              color: theme.palette.text.primary,
            }}
          >
            Token A Mint Address
          </Typography>
          <TextField
            fullWidth
            placeholder="Enter Token A mint address"
            value={tokenMintA}
            onChange={(e) => setTokenMintA(e.target.value)}
            error={tokenMintA !== "" && !isValidPublicKey(tokenMintA)}
            helperText={
              tokenMintA !== "" && !isValidPublicKey(tokenMintA)
                ? "Invalid public key"
                : ""
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                backgroundColor: theme.palette.action.hover,
              },
            }}
          />
        </Box>

        {/* Token Mint B */}
        <Box sx={{ marginBottom: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              marginBottom: 1,
              color: theme.palette.text.primary,
            }}
          >
            Token B Mint Address
          </Typography>
          <TextField
            fullWidth
            placeholder="Enter Token B mint address"
            value={tokenMintB}
            onChange={(e) => setTokenMintB(e.target.value)}
            error={tokenMintB !== "" && !isValidPublicKey(tokenMintB)}
            helperText={
              tokenMintB !== "" && !isValidPublicKey(tokenMintB)
                ? "Invalid public key"
                : ""
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                backgroundColor: theme.palette.action.hover,
              },
            }}
          />
        </Box>

        {/* Fee Configuration */}
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
              marginBottom: 2,
              color: theme.palette.text.primary,
            }}
          >
            Pool Fee Configuration
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              marginBottom: 2,
            }}
          >
            {/* Fee Numerator */}
            <TextField
              fullWidth
              label="Fee Numerator"
              type="number"
              value={feeNumerator}
              onChange={(e) => setFeeNumerator(e.target.value)}
              InputProps={{
                inputProps: { min: 0 },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />

            {/* Fee Denominator */}
            <TextField
              fullWidth
              label="Fee Denominator"
              type="number"
              value={feeDenominator}
              onChange={(e) => setFeeDenominator(e.target.value)}
              InputProps={{
                inputProps: { min: 1 },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />
          </Box>

          {/* Fee Percentage Display */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 1.5,
              borderRadius: "8px",
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Trading Fee:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {calculateFeePercentage()}%
            </Typography>
          </Box>
        </Box>

        {/* Info Box */}
        <Alert severity="info" sx={{ marginBottom: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Default fee: 0.3% (3/1000)
          </Typography>
          <Typography variant="caption" sx={{ display: "block", marginTop: 0.5 }}>
            This fee is charged on each swap transaction
          </Typography>
        </Alert>

        {/* Create Pool Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleCreatePool}
          disabled={loading || !wallet.publicKey}
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
              boxShadow: `0 6px 25px ${theme.palette.primary.main}60`,
              transform: "translateY(-2px)",
            },
            "&:disabled": {
              background: theme.palette.action.disabledBackground,
              color: theme.palette.action.disabled,
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: "white" }} />
          ) : !wallet.publicKey ? (
            "Connect Wallet"
          ) : (
            "Create Pool"
          )}
        </Button>

        {/* Info Note */}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            marginTop: 2,
            textAlign: "center",
            color: theme.palette.text.secondary,
          }}
        >
          Make sure you have enough SOL for transaction fees
        </Typography>
      </Paper>
    </Box>
  );
}