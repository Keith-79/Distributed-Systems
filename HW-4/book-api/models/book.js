'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Book extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Book.init({
    title: { type: DataTypes.STRING, allowNull: false },
    author: { type: DataTypes.STRING, allowNull: false },
    year: DataTypes.INTEGER,
    isbn: { type: DataTypes.STRING, unique: true }
  }, {
    sequelize,
    modelName: 'Book',
    tableName: 'books',
    timestamps: true
  });
  return Book;
};