<?php
// Debug endpoint to inspect PHP environment (extensions, phpinfo). Remove after verification.
require __DIR__ . '/../vendor/autoload.php';
// Output plain text for easier reading
header('Content-Type: text/plain');
echo "Loaded PHP extensions:\n";
print_r(get_loaded_extensions());
echo "\nphpinfo output:\n";
phpinfo();
