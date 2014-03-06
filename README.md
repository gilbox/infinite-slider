kinetic-slider
==============


#How do I add this to my project?

You can download this by:

* Using bower and running `bower install kinetic-slider`
* Downloading [the zip file](https://github.com/gilbox/kinetic-slider/archive/master.zip)

#Dependencies

kinetic-slider depends on Angular, angular-mousewheel, and hamsterjs.


## Getting Started

````javascript
// Add kinetic-slider as a dependency to your app
angular.module('myApp', ['gilbox.kineticSlider']);
});
````

In your HTML you must calculate the content-width yourself:

````html
  <div kinetic-slider class="kinetic-slider-container" content-width="3000">
    <div class="kinetic-slider-content">

      <!-- content goes here -->

    </div>
  </div>
````

# License

The MIT License

Copyright (c) 2013 Gil Birman http://gilbox.me/

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.