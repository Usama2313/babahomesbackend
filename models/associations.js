const User = require("./User");
const Property = require("./Property");
const Message = require("./Message");

const PropertyView = require("./PropertyView");

// User - Property
User.hasMany(Property, { foreignKey: "owner", as: "properties", constraints: false });
Property.belongsTo(User, { foreignKey: "owner", as: "ownerDetails", constraints: false });

// Message - User
Message.belongsTo(User, { as: "sender", foreignKey: "senderId", constraints: false });
Message.belongsTo(User, { as: "receiver", foreignKey: "receiverId", constraints: false });

// Message - Property
Message.belongsTo(Property, { foreignKey: "propertyId", constraints: false });
Property.hasMany(Message, { foreignKey: "propertyId", as: "messages", constraints: false });

// Property - PropertyView
Property.hasMany(PropertyView, { foreignKey: "propertyId", as: "viewHistory", constraints: false });
PropertyView.belongsTo(Property, { foreignKey: "propertyId", constraints: false });
