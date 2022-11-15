const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

const login = asyncHandler(async (req, res) => {
    // VALIDATE USER LOGIN CREDENTIAL
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const foundUser = await User.findOne({ username }).exec();
    if (!foundUser || !foundUser.active) {
        return res.status(401).json({ message: "Unathorized" });
    }
    const passwordMatch = bcrypt.compare(password, foundUser.password);
    if (!passwordMatch) {
        return res
            .status(401)
            .json({ message: "Incorrect Password, unauthorized" });
    }

    //GENERATE ACCESS TOKEN
    const accessToken = jwt.sign(
        {
            UserInfo: {
                username: foundUser.username,
                roles: foundUser.roles,
            },
        },
        accessTokenSecret,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { username: foundUser.username },
        refreshTokenSecret,
        { expiresIn: "1d" }
    );
    res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
});

const refresh = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        return res.status(401).json({ message: "Unathourized" });
    }
    const refreshToken = cookies.jwt;

    jwt.verify(
        refreshToken,
        refreshTokenSecret,
        asyncHandler(async (err, decoded) => {
            if (err) return res.status(403).json({ message: "Forbidden" });
            const foundUser = await User.findOne({
                username: decoded.username,
            });
            if (!foundUser) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const accessToken = jwt.sign(
                {
                    UserInfo: {
                        username: foundUser.username,
                        roles: foundUser.roles,
                    },
                },
                accessTokenSecret,
                { expiresIn: "15m" }
            );
            res.json({ accessToken });
        })
    );
};

const logout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);
    res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
    res.json({ message: "cookies cleared, logout successful" });
};

module.exports = {
    login,
    refresh,
    logout,
};
