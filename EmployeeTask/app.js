const dateFormatSupport = [
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'YYYY-M-D',
    'DD/MM/YYYY',
    'DD-MMM-YYYY',
    'MM/DD/YYYY',
    'M/D/YYYY',
    'D/M/YYYY'
];

const gridHeaders = [
  "Employee ID #1 ", 
  "Employee ID #2 ", 
  "Project ID ", 
  "Days worked"
];

function loadDropdown(){
         
        /* A function loading all supported date formats in the dropdown. */
        /* If a user wants to add or remove a date format, he could do it by */
       /*  changeing the object dateFormatSupport */
   
    if(typeof moment === 'undefined' || typeof jQuery === 'undefined'){
      throw Error("Missing library Moment" + typeof moment + ' - Jquery' + typeof jQuery);
    }

    $.each(dateFormatSupport, function(index, value) {
      let optEl = $('<option />').attr("value", value).text(value);
      $("#date-formats").append(optEl);
    })
}


function load() {                                                   /* A loading function called in the inline event of body element in the markup.  */
  loadDropdown();
                                                                    /* It guarantees that all elements we need in future are already in the DOM */
  const inputElement = document.getElementById('updListFile');
  const sbmtBtn = document.getElementById('submitFile');

  sbmtBtn.addEventListener('mouseup', () => {                      /* Attaching an event listener to the submit button that creates a FileReader Object */
                                                                    /* We need that object in order to read from the uploaded file */
    const getFile = inputElement.files[0];
    const fileReader = new FileReader();
    let selectedVal = $('#date-formats').find(":selected").val();

    fileReader.addEventListener('load',(res) => {              /* Attaching listener to the file input element that triggers on loading the text/csv file  */
      let pivotData = [];
      let dataArr = res.target.result.split('\r\n');            /* Splitting the file content by rows, after that every row is being splited by comma and  */
                                                                /*  the data is being organized in an array of objects contaning a structered view of the file data */

      dataArr.forEach (el => {
        let tempArr = el.split(',').map((prop) => prop.trim());

        pivotData.push({
          EmpID: tempArr[0],
          ProjectID: tempArr[1],
          DateFrom: tempArr[2],
          DateTo:tempArr[3]
        });
      })
                                                                        /* We're sending that array for additional processing - */
      let processedObj = checkPairs(pivotData, selectedVal);           /*checking the pairs in the list and information about the projects they've worked together */
      renderResult(processedObj);                                     /* After recieving that information, we need to render the result in the DOM */
    })

    fileReader.readAsText(getFile);

  });
}



/*------------------------------------*/


function checkPairs(arrObj, dateFormat){

  let len = arrObj.length;
  let orgObj = {};

  /*Two nested for loops in order to compare every single employee with all of the employee list */

  for(let i = 0; i < (len-1); i++) {
    for(let j = (i+1); j < len; j += 1){

      if(arrObj[i]["EmpID"] === arrObj[j]["EmpID"]){     /* If an ID meets another row in the list that has the same ID, */
        continue;                                        /* but different Project ID, the loop is not needed  */
      } else {
        if(arrObj[i]["ProjectID"] === arrObj[j]["ProjectID"]){                      /* When the empIDs are different, but have worked on the same Project, */
                                                                                    /* this should be processed and sent to the  final array. */
          let fromFirst = moment(arrObj[i]["DateFrom"], dateFormat);                /* The Moment object guarantees the correct processing of the dates in files.*/
          let fromSecond = moment (arrObj[j]["DateFrom"], dateFormat);

          /* If an employee has null insted of a regular date, we treat it like today
          */
          let toFirst = (arrObj[i]["DateTo"] === 'null' || arrObj[i]["DateTo"] === 'NULL') ? moment() : moment(arrObj[i]["DateTo"], dateFormat);
          let toSecond = (arrObj[j]["DateTo"] === 'null' || arrObj[j]["DateTo"] === 'NULL') ? moment() : moment(arrObj[j]["DateTo"], dateFormat);
          

          /* We need the latest date from the two FROM dates, and the earliest date of the two TO dates.*/
          /* Only in the period between these two dates, there's a chance to be a period of co-working*/
          let absFrom = moment.max(fromFirst,fromSecond); 
          let absTo = moment.min(toFirst,toSecond);
          
          let diff = absTo.diff(absFrom,"days");        /* If the difference between these two dates is a negative value - */
                                                      /* it means that there's no common period that these two employees have been working together.*/
                                                      /* but if it's a positive - it's a coinsidence*/

          if (diff > 0 ){
              let pairHeader = `${arrObj[i]["EmpID"]}-${arrObj[j]["EmpID"]}`;                       /*  We do this in order to have one and the same name   */
              let pairHeaderSwitched = `${arrObj[j]["EmpID"]}-${arrObj[i]["EmpID"]}`;               /* for all pairs.    */
              let pairName = '';                                                                    /*  For example: If we have a prop called '123-787' we don't need */
                                                                                                    /*  another one called 787 - 123   */
              
              if(typeof orgObj[pairHeaderSwitched] === 'undefined'){
                  pairName = pairHeader;  
              } else {
                  pairName = pairHeaderSwitched;
              }
              
              if (typeof orgObj[pairName] === "undefined"){                                      /* We save the information about all the coincedences in orgObj */
                orgObj[pairName] = {
                  pair : pairName,
                  projectIds: [],
                  length: 0
                };
              }

              orgObj[pairName].projectIds.push({                                           
                  "Project" : arrObj[i]["ProjectID"],
                  "Length" : parseInt(diff, 10)
                });
              orgObj[pairName]["length"] += parseInt(diff, 10);                           /* Summing the whole time spent together in all the projects. */
          } else {
            continue;
          }  
        }
      }
    }
    
   
  } 
  
  let finalArr = Object.values(orgObj).sort((a, b) => b.length - a.length);              /* Sorting the array by duration. */
  console.log(finalArr);
    return finalArr;
}

/* -----------------------------------------------------------------------------------------*/

function renderResult(resultObj){
  if(typeof $("#data-list") !== 'undefined'){
    $("#header").remove();
    $("#data-list").remove();
  }
  
  if(resultObj.length > 0){
    let leadPair = resultObj[0];
    let data = [];

    leadPair["projectIds"].forEach((project, ind) => {
        data.push( [...leadPair["pair"].split('-'),project["Project"], project["Length"]]);
    })
   

    
      let tr = $('<thead id="header"/>');
      let tbody = $('<tbody id="data-list"/>');
      let classNameSet = '';
      let len = gridHeaders.length - 1;
      for(let i=0; i <= len; i++){

        if(i === 0){
          classNameSet = 'noLeftborder';
        } else if(i === len){
          classNameSet = 'noRightborder';
        }
          tr.append( $('<td />', {text : gridHeaders[i]}).attr("class",classNameSet) );
      }
      
      $("#grid").append(tr);
      
      
    $.each(data, function(index, value) {
      let tr = $('<tr />');
      len = value.length - 1;
      
      for(let i=0; i <= len;i++){
        if(i === 0){
          classNameSet = 'noLeftTopborder';
        } else if(i === len){
          classNameSet = 'noRightTopborder';
        }
          tr.append( $('<td />', {text : value[i]}).attr("class",classNameSet) );
      }
      
      tbody.append(tr);
      $("#grid").append(tbody);
    })
  }
  
}