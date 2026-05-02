// models/Property.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database"); // change path if needed

const Property = sequelize.define(
    "Property",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: DataTypes.STRING,
        city: DataTypes.STRING,
        country: DataTypes.STRING,
        price: DataTypes.FLOAT,
        type: DataTypes.STRING,

        status: {
            type: DataTypes.STRING,
            defaultValue: "draft",
        },

        category: DataTypes.STRING,
        image: DataTypes.TEXT,
        address: DataTypes.STRING,
        bedrooms: DataTypes.INTEGER,
        bathrooms: DataTypes.INTEGER,
        area: DataTypes.STRING,

        currency: {
            type: DataTypes.STRING,
            defaultValue: "₹",
        },

        // Property Details
        propertyType: DataTypes.STRING,
        adType: DataTypes.STRING,
        apartmentType: DataTypes.STRING,
        bhkType: DataTypes.STRING,
        floorNo: DataTypes.STRING,
        totalFloors: DataTypes.STRING,
        propertyAge: DataTypes.STRING,
        facing: DataTypes.STRING,
        builtUpArea: DataTypes.FLOAT,

        // Locality
        locality: DataTypes.STRING,
        landmark: DataTypes.STRING,
        similarUnits: DataTypes.STRING,
        directionTip: DataTypes.STRING,

        // Rental
        rentAmount: DataTypes.FLOAT,
        rentType: DataTypes.STRING,
        securityDeposit: DataTypes.FLOAT,
        availableFrom: DataTypes.STRING,
        availableFor: DataTypes.STRING,
        rentNegotiable: DataTypes.BOOLEAN,
        maintenanceType: DataTypes.STRING,
        maintenanceAmount: DataTypes.FLOAT,

        preferredTenants: {
            type: DataTypes.JSON,
            defaultValue: [],
        },

        furnishing: DataTypes.STRING,
        parking: DataTypes.STRING,
        description: DataTypes.TEXT,

        // Amenities
        balconies: DataTypes.STRING,
        waterSupply: DataTypes.STRING,
        petAllowed: DataTypes.STRING,
        gym: DataTypes.STRING,
        nonVeg: DataTypes.STRING,
        gatedSecurity: DataTypes.STRING,
        showProperty: DataTypes.STRING,
        propertyCondition: DataTypes.STRING,

        amenities: {
            type: DataTypes.JSON,
            defaultValue: [],
        },

        // Gallery
        gallery: {
            type: DataTypes.TEXT,
            defaultValue: "[]",
        },

        // Schedule
        schedule: {
            type: DataTypes.JSON,
            defaultValue: {
                availableDays: [],
                timeSlot: "",
            },
        },

        owner: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    },
    {
        tableName: "properties",
        timestamps: true,
    }
);

module.exports = Property;