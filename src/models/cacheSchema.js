const mongoose = require('mongoose')

const cacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    
  },
  data: {
    type: String,
    required: false,
    default: ''
  },
  createdOn: {
    type: Date,
    required: true,
    default: Date.now
  },
  updatedOn: {
    type: Number,
    required: true,
    default: Date.now
  }
})

module.exports = mongoose.model('CacheSchema', cacheSchema)