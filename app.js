const request = require('request');
const domParser = require('dom-parser');
const parser = new domParser();
const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g;
const cheerio = require('cheerio');
const Promise = require('bluebird');
const validUrl=/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g;
var links =[];
var visited ={};

var linksLeft=0;

var queue=[];
var top=0;
var concurrent=100;
var running=0;

const next = (func) =>{
  if(running<=concurrent && queue.length>0){
    queue.shift()();
    // console.log("less");
  }else if(running >= concurrent){
    queue.push(func);
  }else {
    func();
  }
}
const getLinks = (url) =>{
  return new Promise((resolve,reject) =>{
    if(visited[url] == 1)
      {
        linksLeft--;
        if(linksLeft == 0)
          resolve([]);
      }
    running++;
    // console.log("concuurent connections ="+running);
    request(url,(err,res,html) =>{
      // console.log(url);
      // console.log(Object.keys(visited).length+"   "+linksLeft+"     "+queue.length)
      running--;
      linksLeft--;
      if(!err && res.statusCode == 200){
        // let document =parser.parseFromString(html,"text/html");
        // console.log("res");
        let $ = cheerio.load(html);
        let flag=true;
        $('#container').find('a').each(function(){
          if($(this).attr('href')!=null && $(this).attr('href')!=undefined  && validUrl.test($(this).attr('href')))
          {
            if(!visited[$(this).attr('href')]){
              flag=false;
              linksLeft++;
              visited[$(this).attr('href')]=1;
              let link = $(this).attr('href');
              next(function(){
                getLinks(link).then(links =>{
                  if(linksLeft == 0){
                    resolve();
                  }
                });
              });
            }
          }
        });
        if(flag){
          if(linksLeft == 0){
            resolve();
          }
        }
      }
      if(err || res.statusCode!=200){
        console.log("Error Occured for "+url);
        resolve();
      }
    })
  })
}

const startCrawling = url =>{
  getLinks(url).then("Finished///////////////////////////"+console.log(Object.keys(visited).length));

}

startCrawling('http://medium.com');