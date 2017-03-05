/**
 * Created by Logan James on 2017-03-04.
 */
let R = require("rethinkdbdash");
let r = new R({servers: {host: 'localhost', db: 'immm', port: 28015}});
let fs = require('fs');
let PDFParser = require("pdf2json");

let pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
  r.db('immm').table('resumes').insert(pdfData).run().then((record) => console.log(record)).catch(console.error);
});

pdfParser.loadPDF("./test/CVJacob.pdf");

for(var key in "formImage"){
  if (key === "Pages"){
    for(var key in "Pages"){
      if (key === "Texts"){
        for(var key in "Texts"){
          if (key === "R"){
            for(var key in "R"){
              if (key === "T"){

              }
            }
          }
        }
      }
    }
  }
}


