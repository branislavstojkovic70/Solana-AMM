# ============================================
# SOLANA DEX - MAKEFILE
# ============================================

KEYPAIR_DIR = keys

# ============================================
# DEPLOY
# ============================================

deploy-localnet:
	solana config set --url localhost
	anchor build
	anchor deploy

deploy-devnet:
	solana config set --url devnet
	anchor build
	anchor deploy

deploy-testnet:
	solana config set --url testnet
	anchor build
	anchor deploy

deploy-mainnet:
	solana config set --url mainnet-beta
	anchor build
	anchor deploy

# ============================================
# CREATE & MINT 10 TOKENS
# ============================================

create-10-tokens:
	@mkdir -p $(KEYPAIR_DIR)
	@echo "Creating 10 tokens..."
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token1.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token2.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token3.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token4.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token5.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token6.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token7.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token8.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token9.txt
	spl-token create-token --decimals 9 > $(KEYPAIR_DIR)/token10.txt
	@grep "Address:" $(KEYPAIR_DIR)/token1.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint1.txt
	@grep "Address:" $(KEYPAIR_DIR)/token2.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint2.txt
	@grep "Address:" $(KEYPAIR_DIR)/token3.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint3.txt
	@grep "Address:" $(KEYPAIR_DIR)/token4.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint4.txt
	@grep "Address:" $(KEYPAIR_DIR)/token5.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint5.txt
	@grep "Address:" $(KEYPAIR_DIR)/token6.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint6.txt
	@grep "Address:" $(KEYPAIR_DIR)/token7.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint7.txt
	@grep "Address:" $(KEYPAIR_DIR)/token8.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint8.txt
	@grep "Address:" $(KEYPAIR_DIR)/token9.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint9.txt
	@grep "Address:" $(KEYPAIR_DIR)/token10.txt | awk '{print $$2}' > $(KEYPAIR_DIR)/mint10.txt
	@echo "Created 10 tokens!"

create-accounts:
	@echo "Creating token accounts..."
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint1.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint2.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint3.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint4.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint5.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint6.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint7.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint8.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint9.txt)
	spl-token create-account $$(cat $(KEYPAIR_DIR)/mint10.txt)
	@echo "Created all accounts!"

mint-tokens:
	@echo "Minting 10000 tokens each..."
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint1.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint2.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint3.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint4.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint5.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint6.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint7.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint8.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint9.txt) 10000
	spl-token mint $$(cat $(KEYPAIR_DIR)/mint10.txt) 10000
	@echo "Minted 10000 tokens to each!"

show-tokens:
	@echo "Token Addresses:"
	@echo "Token 1: $$(cat $(KEYPAIR_DIR)/mint1.txt)"
	@echo "Token 2: $$(cat $(KEYPAIR_DIR)/mint2.txt)"
	@echo "Token 3: $$(cat $(KEYPAIR_DIR)/mint3.txt)"
	@echo "Token 4: $$(cat $(KEYPAIR_DIR)/mint4.txt)"
	@echo "Token 5: $$(cat $(KEYPAIR_DIR)/mint5.txt)"
	@echo "Token 6: $$(cat $(KEYPAIR_DIR)/mint6.txt)"
	@echo "Token 7: $$(cat $(KEYPAIR_DIR)/mint7.txt)"
	@echo "Token 8: $$(cat $(KEYPAIR_DIR)/mint8.txt)"
	@echo "Token 9: $$(cat $(KEYPAIR_DIR)/mint9.txt)"
	@echo "Token 10: $$(cat $(KEYPAIR_DIR)/mint10.txt)"

.PHONY: deploy-localnet deploy-devnet deploy-testnet deploy-mainnet \
        create-10-tokens create-accounts mint-tokens show-tokens

create-10-tokens:
	@mkdir -p $(KEYPAIR_DIR)
	@echo "Creating Token 1..."
	@solana-keygen new --no-bip39-passphrase --outfile $(KEYPAIR_DIR)/token1.