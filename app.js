//This script is using async library 

const request = require('request');
const cheerio = require('cheerio');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var async = require('async');
var await =require('await');
const validUrl=/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g;
const R= require('ramda');
const csvdata = require('csvdata');
var visited ={};

const websiteUrl = 'https://www.medium.com';//website to crawl

var queue=[];
var running=0; //number of active request
var manualShift = false;
var max=5;// number of ma connections

const getLinks =  async (url) =>{
  // console.log(url);
    if(manualShift)
      queueShift();
    if(!R.isNil(visited[url])){//For checking already visited urls
      queueShift();
    }
    console.log("Trying Url "+url);
    request(url,(err,res,html) =>{
      if(!err && res.statusCode == 200){
        // if(manualShift || queue.length >100)//If want to stop hitting request after some limit just give that limit in condition
        //   {
        //     console.log("manual shift");
        //     queue.length=0;
        //     running=0;
        //     queueShift();
        //     manualShift=true;
        //     return null;
        //   }
        //Using Breadth First Search to crawl all the links
        let $ = cheerio.load(html);
        let arr=[];
        $('body').find('a').each(function(){
          let href = $(this).attr('href');
          if(href!=null && href!=undefined && R.isNil(visited[href]) && validUrl.test(href))
          {
            visited[href]=1;
            queue.push(href);
            queueShift();
          }
        });
      }
      if(err || res.statusCode!=200){
        console.log("Error Occured for "+url);
        queueShift();
      }
    })
}
const queueShift = async () =>{
  // console.log("Concurrent connections "+running);
  // if(manualShift){
  //   // queue.shift();
  // }
  if(running < max && queue.length>0){ //if running connections are less hit more till max
    while(running<max)
      {
        if(queue.length == 0)
          break;
        running++;
        getLinks(queue.shift()).then(x=>{running--;}).catch(err=>{running--;});
      }
  }
  else if(queue.length == 0 && running == 0){
    eventEmitter.emit('end');
  }
}

const eventWaiterForCrawling = (url) =>{
  return new Promise((resolve,reject)=>{
    getLinks(url);
    eventEmitter.on('end', ()=>{
      console.log("Website crawling finished");
      resolve(visited);
    });
  })
}

const crawlAndStoreToFile = async (url) =>{
  console.log('crawling '+url);
  await eventWaiterForCrawling(url);
  let json = Object.keys(visited).map(url =>{
    let x={};
    x['Web Urls']=url;
    return x
  });
  await csvdata.write('./webLinks.csv',json,{log:false,header: 'Web Urls'});
  console.log("Data Written to webLinks.csv file");
  return Object.keys(visited);
}

process.on('SIGINT', function() {
  console.log("Interrupt signal Wrtting urls to file");
  queue.length=0;
  running=0;
  let json = Object.keys(visited).map(url =>{
    let x={};
    x['Web Urls']=url;
    return x
  });
  csvdata.write('./webLinks.csv',json,{log:false,header: 'Web Urls'}).then(
    () =>{
      console.log("Urls writtent to webLinks.csv");
      process.exit();
    }
  )
});

const startCrawling = url =>{
  crawlAndStoreToFile(url)
  .then(urls =>{
    console.log("Found "+urls.length+" urls from "+url );
    console.log("Exiting:");
    process.exit();
  })
}

startCrawling(websiteUrl);