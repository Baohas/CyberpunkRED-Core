const gulp = require("gulp");
const tasks = require("./gulp.tasks.js");

gulp.task("clean", tasks.clean);
gulp.task("assets", tasks.assets);
gulp.task("less", tasks.less);

gulp.task("watch", tasks.watch);
gulp.task("build", tasks.build);
gulp.task("rebuild", tasks.rebuild);
