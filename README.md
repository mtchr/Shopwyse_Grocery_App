# Shopwyse_Grocery_App
prototype of webapp to display the most discounted groceries within a certain radius. Created with user interview data and MoSCoW requirements in a one week design sprint

Persona Alignment   

Our persona, Stephanie Baldwin, is a 45-year-old woman who is the primary shopper for a family of 7. She is always looking to make grocery shopping cost-efficient, and
frequently experienced pain points when deciding which store to buy groceries from, as well as mid-shopping while realizing that groceries are more expensive than she had
initially planned. This frustration grows when she realizes that other stores had the groceries she was looking for with better prices.  

Scope 

The scope of this version of our project, ShopWyse, is focused on only the primary functions of the app. We will include a price comparison feature, a distance feature, simple
login, a grocery cart where users can add all the items they are shopping for, a deals tab showing recent low prices, and notification preferences. The prototype will include
these functions with room for additions.  

Must-Have 

Price comparisons (Present in prototype) 
Distance feature (Present in prototype) 
Simple login (Present in prototype) 
Grocery list/cart (where all of the items selected by the user appear) (Present in prototype) 

Should Have 

Grocery list upload (Not present in prototype) 
Secondary options for products (displays the three cheapest versions of a product) (Not present in prototype) 
Deals tab showing recent low prices (Present in prototype) 
Notification preferences (Present in prototype) 

Could Have 

Delivery/Grocery Carpool (Not present in prototype) 
Substitution preferences 
Collaborative/AI list creation (Not present in prototype) 
Coupon upload (Not present in prototype) 
Map to show routes to different stores (Not present in prototype) 

Won’t Have 

Unrelated advertisements (Not present in prototype) 
Unnecessary data collection (Not present in prototype) 
“Most to Least” filtering option for pricing (Not present in prototype) 
Doesn’t store history of products (preventing people with poor memory from seeing which item they bought the previous time) (Not present in prototype) 
Google map most frequently traveled roads (Not present in prototype) 

 Role: you are an assistant to the product design team for a new app and you will help build prototypes working on features that we, the product design team, have found relevant consumer feedback around. Your model will focus on basic move-arounds of a website version of the app we are creating.  

Output format: You can use HTML and JavaScript and CSS in one file to build the frame and working prototype to use against consumers for interview data. A simulation without any real stores or data is sufficient for now. Use common stores in the Provo/Salt Lake, Utah region for now (Walmart, Trader Joe’s, Smith’s, Costco, Target). 

Context: Grocery shopping is an essential, yet time-consuming task. Many grocery shoppers want to ensure that they are purchasing their groceries at the best available price, but don’t want to spend excessive amounts of time finding the best deals. Our app, ShopWyse, aims to solve this issue by providing a space for the user to search for their groceries beforehand, find the best prices, and receive a primary store recommendation based on what they are planning to buy that day. Our four must-have features for our version 1 prototype are price comparisons (same items, different stores and quantities), a distance feature (The user inputs their zip code and proximity/distance in miles that they are willing to drive to a store. The system then searches for all items at all stores within that proximity in any direction. This feature does not work if the user is not logged into their account), a simple login page, and a grocery list/cart (where all of the items selected by the user appear). 

screen list:

Item search bar, radius dropdown with increments of 5 miles, defaulting to 5 miles. ZIP code input. Big obvious ‘Search’ button. Anchored header with buttons to Deals, Map, Grocery List, and Account. We want this screen to be easy to use for an older audience...

Simple login screen requiring only email and password. Also include two links, one for “Forgot Password” and the other for “Create an Account”, linking to the account creation page. Again, we want this frictionless and non-invasive for a busy, older audience.  

Simple account creation screen requiring only email and password. Two optional check boxes, one “Opt-in to marketing emails” and the other “Save my shopping preferences”. 

“Hot Deals” screen that shows low prices nearby. Prompt the user to provide ZIP if needed. 

Search Results screen showing items related to Item Search. To make this easy to use, include big icons, a list view, and an obvious ‘add to list’ button for each item. We also want a collapsible preview of the user’s list...

Grocery List Screen showing all items that a user has added from item search results. Again, easy to use buttons to remove...  

Map view showing a tag on each store showing the number of items from the list to be bought there. When a store is clicked on, it redirects the user to the itemized grocery list for items at that specific store with an estimated total for each item as well as the store, before taxes. The user should then be able to direct themself back to the map or the full grocery list from that page...

 
Constraints:  

Prototype only. Use simulated item data for Trader Joes, Costco, and Walmart in Provo. 
Single-file implementation. Keep HTML, CSS, and JS all in one file. 
Grocery list, ZIP, and radius should be remembered between screens to offer a seamless prototype experience. 
List and map functionality requires the user to be logged in (for the prototype, accept any email and password) 
