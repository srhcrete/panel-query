/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/search', 'N/error', 'N/log', 'N/file', 'N/email', '/documents/lib/lodash.js'],
  //dummy lodash path above
  function(search, error, log, file, email, lodash) {

    var exports = {};

    function onRequest(context) {
      log.audit({title: 'Request Received'});
      //suitescript log type for historical documentation above

      var nsResults = findPanels();

      context.response.writeFile({
        file: createAndSaveFile(nsResults),
      });

      sendEmailWithAttachment();
    }

    function findPanels() {
      log.audit({ title: 'finding panels...' });

      //Load search created in NetSuite
      var panelSearch = search.load({
        //Dummy netsuite search id
        id: 'customsearch_panels',
      });

      //try-catch block for search error handling
      try {
        var searchResults = panelSearch.run();
        var resultIndex = 0;
        var resultStep= 1000;
        var returnSearchResults = [];

        //Do While block for handling search result sets greater than 1,000
        do{
          //fetch one result set
          var resultSlice = searchResults.getRange(resultIndex, resultIndex + resultStep);

          //increase pointer
          resultIndex = resultIndex + resultStep;

          //process or log the results
          var resultsSetLength = resultSlice.length;
          log.debug('resultSlice length', resultsSetLength);
          for (var rs in resultSlice) {
            returnSearchResults.push(resultSlice[rs]);
          }
          log.debug('array length', returnSearchResults.length);

        } while (resultSlice.length > 0)
      } catch (err) {
        throw error.create({
          name: "SEARCH_COULD_NOT_RUN",
          message: err,
        })
      }

      return returnSearchResults;
    }
    function createAndSaveFile(dataSet) {
      log.audit({ title: 'creating file...' });

      var csvFile = file.create({
        name: 'panel_data.csv',
        contents:
          'date,item,qty,description,sides,width,length,acrylic\n',
        //dummy id of folder in file cabinet
        folder: 555555,
        fileType: 'CSV'
      });

      //parse sides lit
      var doGetSidesLit = function(memo) {
        var regx = /LBP824(WW|NW|CW|BL|SW)(\d)-/;
        var sidesArr = memo.match(regx);
        if(sidesArr !== null) {
          sides = sidesArr[2];
        }
        else {
          log.debug('No sides', 'Could not parse sides lit');
          sides = ' ';
        }

        return sides
      }

      //parse width
      var doGetWidth = function(memo) {
        var regx = /-(\d+\.?\d+?)(\s*in\.?\s*|x|\.|\")/;
        var widthArr = memo.match(regx);
        if(widthArr !== null) {
          width = widthArr[1];
        }
        else {
          log.debug('No width', 'Could not parse width');
          width = ' ';
        }
        return width;
      }

      //parse length
      var doGetLength = function(memo) {
        var regx = /x (\d*\.*\d*)(\s*in\.?\s*|\.|\")/;
        var lengthArr = memo.match(regx);
        if(lengthArr != null) {
          length = lengthArr[1];
        } else {
          log.debug('no length', 'Could not parse length');
          length = ' ';
        }

        return length
      }

      //parse shape
      var checkForRound = function(memo) {
        var regx = /(round)/;
        var roundArr = memo.match(regx);
        if(roundArr != null) {
          return true
        } else {
          return false
        }
      }

      //parse acrylic type used
      var doGetAcrylicType = function(width, sidesLit) {
        var acryl;

        if (sidesLit !== 1) {
          acryl = lodash.divide(width, 2);
        }
        else {
          acryl = width;
        }

        if (acryl <= 6) {
          return 'S';
        }
        else if (acryl <= 14) {
          return 'L';
        }
        else if (acryl <= 36) {
          return 'XL';
        }
        else {
          return 'XXL';
        }
      }

      //pass parsed data into CSV columns
      for(var i = 0; i < dataSet.length; i++) {
        var rec = dataSet[i].getAllValues();

        var description = rec.memo;
        var sidesLit = doGetSidesLit(description);
        var width = doGetWidth(description);
        var length = doGetLength(description);
        var acrylic = doGetAcrylicType(width, sidesLit);
        var round = checkForRound(description);

        if(round === false) {
          var result = [
            rec.trandate,
            rec.item[0].text.replace(/[\n\r\t,]/g, ' '),
            rec.quantity,
            rec.memo.replace(/[\n\r\t,]/g, ' '),
            sidesLit,
            width,
            length,
            acrylic,
          ]

          //create CSV
          csvFile.appendLine({
            value: result.join(',')
          });
        }

      }

      var csvFileId = csvFile.save();

      var fileObj = file.load({
        id: csvFileId,
      });

      return fileObj;
    }

    function sendEmailWithAttachment() {
      var fileObj = file.load({ id: 555555 });
      var senderId = 555555;
      var recipientEmail1 = 'email1@email.com';
      var recipientEmail2 = 'email2@email.com';

      var outgoingMessage = email.send({
        author: senderId,
        recipients: [recipientEmail1, recipientEmail2],
        subject: 'Panel Data',
        body:
          'Message Body.',
        attachments: [fileObj]
      });

      return outgoingMessage;
    }

    exports.onRequest = onRequest;
    return exports;
  });
