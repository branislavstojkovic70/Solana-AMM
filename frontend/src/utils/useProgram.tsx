import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import IDL from "./idl.json";
import {type Amm } from "./idltype";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

const programId = new PublicKey("FiG4LoB7kGhAsufQGeZkBs72qgN6D4wFQpwVByGGo65F");

export const useProgram = () => {
  const wallet = useAnchorWallet();

  const { program, connection } = useMemo(() => {

    const connection = new Connection("http://127.0.0.1:8899", "confirmed");


    let program = new Program(IDL as Amm, { connection });

    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      setProvider(provider);

      program = new Program(IDL as Amm, provider);
    } else {
      
    }

    

    return { program, connection };

  }, [wallet]);

  return { program, connection, wallet };
};