import express from 'express'
import type { Request, Response } from 'express'

const orderApp = express()


orderApp.use(express.json())

orderApp.get('/health',(req:Request, res: Response) =>{
  res.json({status:'UP', service:'Order Service'})
})

orderApp.get('/orders', (req:Request, res:Response)=>{
  res.json({
    service:'Order Service',
    data:[
      { id: 'ord_101', item: 'Mechanical Keyboard', status: 'Delivered' },
      { id: 'ord_102', item: '4K Monitor', status: 'Processing' },
    ]
  })
})

const PORT = process.env.PORT || 4002
orderApp.listen(PORT, ()=>{
  console.log(`[Order Service] running on PORT ${PORT}`)
})