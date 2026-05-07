# React Admin Scroll Notice Management and Frontend Header Scrolling Display Requirements Document \(English Version\)

# 1\. Requirement Overview

This document is used to clarify the management function of \&\#34;scroll notice content\&\#34; in the background management system \(Admin\) of the React project, as well as the display function of scroll notice at the top of the frontend page\. It ensures that AI can clearly identify the requirements of each module, interface specifications, interaction logic and exception handling rules, realizing the full\-process closed loop of \&\#34;Admin manages scroll notice content → frontend header automatically scrolls and displays\&\#34;, so as to meet the rapid transmission needs of announcements, notifications and other information\.

Core Goal: The Admin side can conveniently add, edit, delete, enable/disable scroll notice content\. The top of the frontend page automatically scrolls and displays the enabled notice content according to the configuration rules, supporting interaction optimization \(such as pause on hover\), and adapting to the existing React technology stack and Admin management system of the project\.

# 2\. Scope of Application

- Development Side: React frontend development \(header scroll component development\), React Admin background development \(scroll notice management module development\), interface development \(frontend\-backend data interaction\);

- User Side: Admin administrators \(operating scroll notice content management\), all frontend visitors \(viewing scroll notice at the top\);

- Technology Stack: React \(frontend \+ Admin\), interfaces based on RESTful specifications, compatible with the existing technical architecture of the project\.

# 3\. Core Functional Requirements

## 3\.1 Admin Side Scroll Notice Management Function

A new \&\#34;Scroll Notice Management\&\#34; menu is added on the Admin side to support the full lifecycle management of scroll notice content\. All operations shall be synchronized to the frontend header scroll component and take effect in real time\.

### 3\.1\.1 Scroll Notice List Display

- Display Fields: Serial Number, Scroll Notice Content \(truncate the first 20 characters, display the full content on hover\), Scroll Speed \(optional values: Slow/Medium/Fast, corresponding to specific values\), Scroll Direction \(default: horizontal from right to left\), Enable Status \(Enabled/Disabled\), Creation Time, Operations;

- Operation Buttons: Edit, Delete, Enable/Disable \(status switch\);

- Auxiliary Functions: Pagination \(default 10 items per page\), Search \(fuzzy search by scroll notice content\), Batch Delete \(optional\), Refresh \(obtain the latest scroll notice list in real time\)\.

### 3\.1\.2 Add Scroll Notice Content

- Form Fields \(required/optional clearly marked\):
        

    - Scroll Notice Content \(required\): Text type, maximum length 200 characters, special symbols are prohibited \(except Chinese, English, numbers and common punctuation\);

    - Scroll Speed \(required\): Drop\-down selection, options are \[Slow \(2px/frame\), Medium \(3px/frame\), Fast \(5px/frame\)\], default is \&\#34;Medium\&\#34;;

    - Scroll Direction \(optional\): Drop\-down selection, options are \[Horizontal from right to left \(default\), Horizontal from left to right\], vertical scrolling is not supported temporarily;

    - Enable Status \(optional\): Checkbox, default is \&\#34;Enabled\&\#34;, which is immediately synchronized to the frontend scroll after enabling;

    - Remarks \(optional\): Text type, maximum length 100 characters, used by administrators to record the purpose of the scroll notice \(not displayed on the frontend\)\.

- Form Validation: Prompt \&\#34;Please enter scroll notice content\&\#34; when the content is empty, and prompt \&\#34;Scroll notice content shall not exceed 200 characters\&\#34; when the character limit is exceeded;

- Submission Logic: After clicking \&\#34;Submit\&\#34;, the interface submits the data\. If successful, the list is refreshed and the prompt \&\#34;Add Success\&\#34; is displayed; if failed, specific error information is prompted \(such as interface exception, parameter error\)\.

### 3\.1\.3 Edit Scroll Notice Content

- Trigger Method: Click the \&\#34;Edit\&\#34; button in the list to pop up the edit form, which is filled with all current information of the scroll notice by default;

- Editing Rules: Consistent with the add form fields, supporting modification of all fields \(except Creation Time, which cannot be modified\);

- Submission Logic: After clicking \&\#34;Save\&\#34;, the interface submits the modified data\. If successful, the list is refreshed and the prompt \&\#34;Edit Success\&\#34; is displayed; if failed, specific error information is prompted;

- Cancel Editing: Click the \&\#34;Cancel\&\#34; button to close the form without saving any modifications and return to the list page\.

### 3\.1\.4 Delete Scroll Notice Content

- Trigger Method: Click the \&\#34;Delete\&\#34; button in the list to pop up a confirmation pop\-up window, prompting \&\#34;Are you sure to delete this scroll notice content? It cannot be recovered after deletion\&\#34;;

- Deletion Logic: Click \&\#34;Confirm\&\#34; to submit a deletion request through the interface\. If successful, the list is refreshed and the prompt \&\#34;Delete Success\&\#34; is displayed; click \&\#34;Cancel\&\#34; to close the pop\-up window without performing the deletion operation;

- Batch Delete: Select multiple scroll notice contents, click the \&\#34;Batch Delete\&\#34; button, execute the above confirmation and deletion logic, and prompt \&\#34;A total of X scroll notice contents have been deleted\&\#34; after successful deletion\.

### 3\.1\.5 Enable/Disable Switch

- Trigger Method: Click the \&\#34;Enable/Disable\&\#34; button in the list to switch the status directly without additional confirmation;

- Status Logic: Enable → The frontend header scroll component immediately loads the scroll notice; Disable → The frontend header scroll component immediately removes the scroll notice;

- Feedback Prompt: After successful status switch, prompt \&\#34;This scroll notice has been enabled\&\#34;/\&\#34;This scroll notice has been disabled\&\#34;, and the list status is updated synchronously\.

## 3\.2 Frontend Page Header Scroll Display Function

A fixed scroll notice area is added at the top of all frontend pages \(except the login page\) to display the enabled scroll notice content on the Admin side, following the scroll rules configured on the Admin side, and balancing interaction experience and page aesthetics\.

### 3\.2\.1 Display Position and Style

- Position: The top of the page \(above the navigation bar\), full screen width, fixed height \(recommended 40px\), without blocking other page elements;

- Style: Background color \(default light blue, configurable\), text color \(default white, configurable\), text centered \(vertically centered\), 1px solid \#eee at the bottom border;

- Hiding Logic: When there is no enabled scroll notice content, the scroll area is automatically hidden without occupying page space\.

### 3\.2\.2 Scrolling Rules

- Data Source: Request the interface in real time to obtain all enabled scroll notice content on the Admin side \(sorted in reverse order of creation time, the latest created scrolls first\);

- Scrolling Method: Horizontal scrolling, executed according to the \&\#34;scroll direction\&\#34; and \&\#34;scroll speed\&\#34; configured on the Admin side, default is \&\#34;from right to left, medium speed \(3px/frame\)\&\#34;;

- Multi\-content Processing: When there are multiple enabled scroll notices, the contents are separated by \&\#34;\|\&\#34;, scrolling seamlessly and cyclically without pause \(pause can be configured if needed, default is no pause\);

- Real\-time Synchronization: After the Admin side adds, edits, deletes, enables/disables the scroll notice content, the frontend scroll area is automatically updated synchronously within 10 seconds without refreshing the page \(or through interface polling with a polling interval of 10 seconds\)\.

### 3\.2\.3 Interaction Experience

- Pause on Hover: When the mouse hovers over the scroll area, the scrolling pauses immediately; when the mouse leaves, the scrolling resumes;

- Click to Jump \(optional\): If the scroll notice content contains a link \(a link can be configured when adding/editing on the Admin side, optional field\), click the scroll notice text to jump to the corresponding link \(open in a new window by default\); no click effect if there is no link;

- Mobile Adaptation: The scroll speed is automatically slowed down on mobile terminals \(default slow speed 2px/frame\) to avoid being too fast to read; when touching the scroll area, the scrolling pauses, and resumes after the touch ends\.

# 4\. Interface Requirements \(Frontend\-Backend Interaction\)

Interfaces follow RESTful specifications\. All interfaces shall return a unified format \(status code, prompt information, data\), support cross\-domain, and adapt to the existing interface interceptor of the project\.

|Interface Name|Request Method|Request URL|Request Parameters \(JSON\)|Return Data \(JSON\)|Remarks|
|---|---|---|---|---|---|
|Get Scroll Notice List|GET|/api/scrollNotice/list|pageNum \(default 1\), pageSize \(default 10\), keyword \(optional, search keyword\)|code:200, msg:\&\#34;success\&\#34;, data:\{total, list:\[\{id, content, speed, direction, status, createTime, remark, link\}\]\}|Admin side list display, frontend obtain enabled list|
|Add Scroll Notice|POST|/api/scrollNotice/add|content \(required\), speed \(required\), direction \(optional\), status \(optional\), remark \(optional\), link \(optional\)|code:200, msg:\&\#34;Add Success\&\#34;, data:null|Admin side add operation|
|Edit Scroll Notice|PUT|/api/scrollNotice/edit|id \(required\), content \(required\), speed \(required\), direction \(optional\), status \(optional\), remark \(optional\), link \(optional\)|code:200, msg:\&\#34;Edit Success\&\#34;, data:null|Admin side edit operation|
|Delete Scroll Notice|DELETE|/api/scrollNotice/delete|id \(required, single deletion\), ids \(optional, batch deletion, array\)|code:200, msg:\&\#34;Delete Success\&\#34;, data:null|Admin side single/batch deletion|
|Switch Enable/Disable|PUT|/api/scrollNotice/changeStatus|id \(required\), status \(required, 0=Disabled, 1=Enabled\)|code:200, msg:\&\#34;Status Switch Success\&\#34;, data:null|Admin side status switch|

Supplementary Note: In the interface parameters, the corresponding relationship of speed values is: 1=Slow \(2px/frame\), 2=Medium \(3px/frame\), 3=Fast \(5px/frame\); the corresponding relationship of direction values is: 1=Horizontal from right to left, 2=Horizontal from left to right; the corresponding relationship of status values is: 0=Disabled, 1=Enabled\.

# 5\. Exception Handling Requirements

## 5\.1 Admin Side Exception Handling

- Interface Request Failure: If the interface request fails for all operations \(add, edit, delete, etc\.\), specific error information is prompted \(such as \&\#34;Network exception, please try again\&\#34;, \&\#34;Interface request timeout\&\#34;\), and no status change is performed;

- Data Validation Failure: When submitting the form, if the parameters do not meet the requirements \(such as empty content, exceeding the character limit\), an error is prompted in real time, and submission is not allowed;

- Permission Control: Only Admin administrators \(with scroll notice management permission\) can access this menu\. When a user without permission accesses, it jumps to the Admin no\-permission page, prompting \&\#34;No operation permission, please contact the administrator\&\#34;\.

## 5\.2 Frontend Scroll Component Exception Handling

- Interface Request Failure: When the frontend fails to obtain the scroll notice list, the scroll area is hidden without reporting an error or affecting other page functions, and the request is retried every 10 seconds until the request is successful;

- Scroll Notice Content Exception: If a certain scroll notice content is empty \(due to abnormal operation on the Admin side\), it is automatically filtered out and not displayed, without affecting the scrolling of other scroll notices;

- Scrolling Exception: If there is stuttering or misalignment during scrolling, the scrolling status is automatically reset to resume normal scrolling without affecting user operations\.

# 6\. Non\-Functional Requirements

- Performance: The frontend scroll component does not occupy too much memory, and the scrolling is smooth without stuttering \(FPS≥60\); the interface request response time ≤500ms, and polling does not affect page performance;

- Compatibility: Adapt to mainstream browsers \(latest version\) such as Chrome, Firefox, Edge, and adapt to mainstream mobile browsers \(iOS, Android\);

- Maintainability: Modular code development, the Admin side scroll notice management module and frontend scroll component can be modified and expanded independently; interface parameters can be adjusted flexibly to support subsequent addition of fields \(such as scroll notice effective time\);

- Scalability: Reserve expansion interfaces such as vertical scrolling, scroll pause time configuration, and multi\-area scrolling to facilitate subsequent iterations\.

# 7\. Constraints

- Technical Constraints: It must be developed based on the existing React technology stack of the project, and the Admin side must adapt to the UI style and permission system of the existing background management system;

- Data Constraints: The maximum length of the scroll notice content is 200 characters, and special symbols are prohibited to avoid affecting scroll display and page layout;

- Interaction Constraints: The frontend scroll component only supports horizontal scrolling, and vertical scrolling is not supported temporarily; pause on hover is a mandatory interaction and cannot be omitted;

- Synchronization Constraints: After the Admin side operation, the frontend scroll area must be updated synchronously within 10 seconds without manual page refresh by the user\.

# 8\. Acceptance Criteria

## 8\.1 Admin Side Acceptance Criteria

- Menu Display: The \&\#34;Scroll Notice Management\&\#34; menu is displayed normally, and only authorized users can access it;

- List Function: Pagination, search, and refresh functions are normal, fields are displayed completely, and operation buttons can be clicked normally;

- Add/Edit: Form validation is normal, the list is updated synchronously after successful submission, and the prompt information is correct; specific errors are prompted when failed;

- Delete/Status Switch: The operation process is normal, the confirmation pop\-up window and prompt information are correct, and data is deleted/status changed synchronously;

- Exception Scenarios: When the interface fails, permission is insufficient, or data validation fails, the processing logic is correct and no error is reported\.

## 8\.2 Frontend Scroll Component Acceptance Criteria

- Display Effect: The position and style of the scroll area meet the requirements, and it is automatically hidden when there is no enabled scroll notice;

- Scroll Function: The scroll direction and speed are consistent with the configuration on the Admin side, multi\-content scrolls seamlessly and cyclically without stuttering or misalignment;

- Interaction Experience: Pause on hover and click to jump \(when there is a link\) functions are normal, and mobile adaptation is good;

- Real\-time Synchronization: After the Admin side operation, the frontend is updated synchronously within 10 seconds without manual refresh;

- Exception Scenarios: When the interface request fails or the content is abnormal, the processing logic is correct and does not affect other page functions\.

# 9\. Supplementary Notes

- If it is necessary to add functions such as \&\#34;scroll notice effective time\&\#34;, \&\#34;scroll notice expiration time\&\#34;, and \&\#34;designated page display\&\#34;, it can be iterated later, which are not included in this requirement;

- The style of the frontend scroll component \(background color, text color, height\) can be configured\. The specific values are provided by UI design, and configuration items are reserved during development;

- Interface development must be synchronized with the frontend and backend to ensure consistent parameters and return formats, avoiding functional abnormalities caused by interface differences\.

> （注：文档部分内容可能由 AI 生成）
