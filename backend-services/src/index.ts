import express from 'express'
import type { Request, Response } from 'express'

const userApp = express()
const orderApp = express()

userApp.use(express.json())
orderApp.use(express.json())

// ----------------------------------------------------
// 1. USER SERVICE (Port 4001)
// ----------------------------------------------------

userApp.get('/users', (req:Request, res:Response)=>{
  res.json({
    service:'User Service',
    data:[
      { id: 'usr_1', name: 'Alice', role: 'Admin' },
      { id: 'usr_2', name: 'Bob', role: 'Developer' },
    ]
  })
})

// ----------------------------------------------------
// 2. ORDER SERVICE (Port 4002)
// ----------------------------------------------------

orderApp.get('/orders', (req:Request, res:Response)=>{
  res.json({
    service:'Order Service',
    data:[
      { id: 'ord_101', item: 'Mechanical Keyboard', status: 'Delivered' },
      { id: 'ord_102', item: '4K Monitor', status: 'Processing' },
    ]
  })
})

const userPORT = process.env.userPORT || 4001
userApp.listen(userPORT, ()=>{
  console.log(`[User Service] running on PORT ${userPORT}`)
})
const orderPORT = process.env.orderPORT || 4002
orderApp.listen(orderPORT, ()=>{
  console.log(`[Order Service] running on PORT ${orderPORT}`)
})