const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select("-password").lean();
    if (!users?.length) {
        return res.status(400).json({
            message: "No users found",
        });
    }
    res.json(users);
});

const createNewUser = asyncHandler(async (req, res) => {
    const { username, password, roles } = req.body;

    //confirm request
    if (!username || !password) {
        return res.status(400).json({ message: "All fields  are required" });
    }

    //check if username exists
    const duplicate = await User.findOne({ username })
        .collation({ locale: "en", strength: 2 })
        .lean()
        .exec();

    if (duplicate) {
        return res.status(409).json({ message: "Username already exists" });
    }

    //Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const userObject = !Array.isArray(roles || !roles.length)
        ? { username, password: passwordHash }
        : { username, password: passwordHash, roles };

    //Create and store new user
    const user = await User.create(userObject);

    if (user) {
        return res
            .status(201)
            .json({ message: `New user '${username}' created successfully` });
    } else {
        return res.status(400).json({ message: "Invalid user data received" });
    }
});

const updateUser = asyncHandler(async (req, res) => {
    const { id, username, roles, active, password } = req.body;

    //confirm request
    if (
        !id ||
        !username ||
        !Array.isArray(roles) ||
        !roles.length ||
        typeof active !== "boolean"
    ) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findById(id).exec();

    if (!user) {
        return res
            .status(404)
            .json({ message: `User with id: '${id}' not found` });
    }

    const duplicate = await User.findOne({ username })
        .collation({ locale: "en", strength: 2 })
        .lean()
        .exec();
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: "Duplicate username" });
    }
    user.username = username;
    user.active = active;
    user.roles = roles;

    if (password) {
        user.password = await bcrypt.hash(password, 10);
    }
    const updatedUser = await user.save();

    res.json({
        message: `User profile ${updatedUser.username} updated successfully`,
    });
});

const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ message: "User id is required" });
    }
    const user = await User.findById(id).exec();

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const note = await Note.findOne({ user: id }).lean().exec();
    if (note) {
        return res.status(400).json({ message: "User has assigned notes" });
    }

    const deletedUser = await user.deleteOne();

    const response = `User ${deletedUser.username} with ID ${deletedUser._id} deleted successfully`;

    res.json({ message: response });
});

module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser,
};
