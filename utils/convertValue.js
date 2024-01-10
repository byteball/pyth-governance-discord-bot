const Decimal = require('decimal.js');

const fieldTypes = {
  swap_fee: "percent",
  arb_profit_tax: "percent",
  adjustment_period: "date",
  presale_period: "date",
  auction_price_halving_period: "date",
  token_share_threshold: "percent",
  min_s0_share: "percent",
  max_drift_rate: "percent",
  change_drift_rate: "percent",
};

function rawToFormatVotingValue(type, value) {
  switch (type) {
    case "date":
      return new Decimal(value).div(24).div(3600).toNumber();
    case "percent":
      return new Decimal(value).times(100).toNumber();
    default:
      return value;
  }
}

function getSuffix(type) {
  switch (type) {
    case "date":
      return " days";
    case "percent":
      return "%";
    default:
      return "";
  }
}

function convertFieldValues(name, value) {
    return rawToFormatVotingValue(fieldTypes[name], value) + getSuffix(fieldTypes[name]);
}

module.exports = {
  convertFieldValues,
}
