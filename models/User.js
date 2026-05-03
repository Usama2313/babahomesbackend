// models/User.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database"); // adjust path if needed

const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
        },

        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: true,
            validate: {
                isEmail: true,
            },
        },

        phone: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: true, // behaves like sparse in MongoDB
        },

        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        profilePicture: {
            type: DataTypes.TEXT("long"),
        },

        role: {
            type: DataTypes.STRING,
            defaultValue: "Property Finder", // Default role updated
        },

        city: {
            type: DataTypes.STRING,
        },

        country: {
            type: DataTypes.STRING,
        },
        isBlocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        lastLogin: {
            type: DataTypes.DATE,
        },
    },
    {
        tableName: "users",
        timestamps: true, // adds createdAt & updatedAt
    }
);

module.exports = User;