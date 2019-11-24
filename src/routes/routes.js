const express = require('express')
const router = express.Router()
const CacheSchema = require('../models/cacheSchema')
const randomstring = require('randomstring');

const maxSize = 10 //Max size of cache is assumed to be 100
const TTL = 86400000 //Time to Live assumed to be 24 hours

// Get all keys
router.get('/getAllKeys', async (req, res) => {
    try {
        const cacheData = await CacheSchema.find().select('key -_id')
        const keys = [];
        cacheData.map(data => keys.push(data.key))
        res.json(keys)
      } catch (err) {
        res.status(500).json({ message: err.message })
      }
})

// Get data from specific key
router.get('/getByKey/:key', async(req, res) => {
    try {
        const cacheData = await CacheSchema.find({key: req.params.key}).select('data -_id');
        const response = {};
        if(cacheData.length > 0 && new Date().valueOf() - cacheData[0].updatedOn > TTL) {
            console.log('Cache hit')
            cacheData[0].updatedOn = new Date().valueOf();
            const updatedEntity = await cacheData[0].save()
            response.data = cacheData[0].data,
            response.status= true
        } else {
            console.log('Cache miss')
            const key = randomstring.generate({
                length: 6,
                charset: 'numeric'
              });
              const cacheEntity = new CacheSchema({
                key: key,
              })
              checkCacheSizeAndRemove();
              const newEntity = await cacheEntity.save()
              response.key = key;
              response.status = true;
        }
        res.status(200).json(response);
    } catch(err) {
        res.status(500).json({ message: err.message })
    }
})

// Create new key
router.post('/add', async (req, res) => {
    const cacheEntity = new CacheSchema({
        key: req.body.key || randomstring.generate({length: 6, charset: 'numeric'}),
        data: req.body.data
      })
      try {
        const cacheData = await CacheSchema.find({key: cacheEntity.key});
        if(cacheData.length > 0) {
            res.status(200).json({message: 'Key already present in the cache'});
        } else {
            checkCacheSizeAndRemove();
            const newEntity = await cacheEntity.save();
            const response = {
                key: newEntity.key,
                data: newEntity.data
            }
            res.status(201).json(newEntity)
        }
      } catch (err) {
        res.status(400).json({ message: err.message })
      }
})

// Update specified key
router.put('/update/:key', async (req, res) => {
    try {
        const cacheData = await CacheSchema.find({key: req.params.key});
        if(cacheData.length > 0) {
            cacheData[0].data = req.body.data;
            cacheData[0].updatedOn = new Date().valueOf();
            const updatedEntity = await cacheData[0].save();
            const response = {
                data: updatedEntity.data,
                key: updatedEntity.key,
                status: true
            }
            res.status(201).json(response)
        }
        res.status(404);
    }
    catch(err) {
        res.status(500).json({ message: err.message })
    }
    
})

// Delete specified key
router.delete('/delete/:key', async(req, res) => {
    try {
        const cacheData = await CacheSchema.deleteOne({key: req.params.key});
        
        res.status(200).json({ message: 'Deleted the key from the cache' })
      } catch(err) {
        res.status(500).json({ message: err.message })
      }
})
router.delete('/deleteAllKeys', async(req, res) => {
    try {
        
        await CacheSchema.deleteMany({});
        res.status(200).json({ message: 'Deleted all the keys' })
      } catch(err) {
        res.status(500).json({ message: err.message })
      }
})

//Funtion to check if the cache size is breached & remove keys if needed
//The most least updated key will be removed from the cache if the cache size exceeds the limit
async function checkCacheSizeAndRemove() {
    try{
        const cache = await CacheSchema.find({}).sort({updatedOn: 1});
        if(cache.length < maxSize) {
            return true;
        } else {
            await CacheSchema.deleteOne({key: cache[0].key});
            return true;
        }
    } catch(err) {
        console.log(err.message);
        return false;

    }
}
module.exports = router