User.hasMany(Loan);
Loan.belongsTo(User);

Item.hasMany(Loan);
Loan.belongsTo(Item);
