import {
	AppBar,
	Box,
	Button,
	SvgIcon,
	Toolbar,
	Typography,
} from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { FileCopy, LockOpen, Logout, Upload } from "@mui/icons-material";
import "../index.css";

// @ts-ignore
import Logo from "../assets/logo-light.svg?react";

export default function Navbar() {
	const navigate = useNavigate();

	return (
		<Box
			sx={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<AppBar position="relative" sx={{ flex: "0 1 auto" }}>
				<Toolbar
					sx={{
						minHeight: "64px",
						px: 2,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Box
						onClick={() => navigate("/")}
						sx={{
							width: "64px",
							height: "64px",
							display: "flex",
							alignItems: "center",
							flexShrink: 0,
							gap: 1,
							cursor: "pointer",
						}}
					>
						<SvgIcon
							id="logo"
							inheritViewBox
							component={Logo}
							sx={{
								width: "auto",
								height: "70%",
							}}
						/>
						<Typography
							variant="h1"
							sx={{
								fontSize: "24px",
								color: "#F5F5F5",
							}}
						>
							MedVault
						</Typography>
					</Box>

					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 3,
						}}
					>
						<Button
							onClick={() => navigate("/files")}
							startIcon={<FileCopy sx={{ color: "white" }} />}
							sx={{
								textTransform: "capitalize",
								color: "#F5F5F5",
							}}
						>
							Files
						</Button>

						<Button
							onClick={() => navigate("/")}
							startIcon={<Upload sx={{ color: "white" }} />}
							sx={{
								textTransform: "capitalize",
								color: "#F5F5F5",
							}}
						>
							Upload
						</Button>

						<Button
							onClick={() => navigate("/access")}
							startIcon={<LockOpen sx={{ color: "white" }} />}
							sx={{
								textTransform: "capitalize",
								color: "#F5F5F5",
							}}
						>
							Access
						</Button>
					</Box>

					<Button
						onClick={() => {
							localStorage.removeItem("token");
							navigate("/login");
						}}
						startIcon={<Logout sx={{ color: "white" }} />}
						sx={{
							textTransform: "capitalize",
							color: "#F5F5F5",
							flexShrink: 0,
						}}
					>
						Logout
					</Button>
				</Toolbar>
			</AppBar>

			<div id="detail" style={{ flex: "1 1 auto", width: "100%" }}>
				<Outlet />
			</div>
		</Box>
	);
}
