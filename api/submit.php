<?php
/**
 * Global Business News Today — form handler.
 *
 * Receives newsletter, contact and press release submissions from the site
 * and emails them to the site owner. The recipient address only lives here,
 * on the server, so it is never exposed in the public HTML.
 */

declare(strict_types=1);

const RECIPIENT = 'digitalkazmi@gmail.com';
const SENDER = 'info@globalbusinessnewstoday.com';
const SITE_NAME = 'Global Business News Today';
const RATE_LIMIT = 5;          // submissions allowed per IP...
const RATE_WINDOW = 600;       // ...within this many seconds
const MIN_FILL_MS = 1500;      // faster than this is treated as a bot

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

function respond(int $status, bool $ok, string $message): void
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message]);
    exit;
}

function field(string $name, int $maxLength): string
{
    $value = isset($_POST[$name]) && is_string($_POST[$name]) ? $_POST[$name] : '';
    $value = str_replace("\0", '', trim($value));
    return mb_substr($value, 0, $maxLength);
}

function oneLine(string $value): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $value));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'Method not allowed.');
}

$forms = [
    'newsletter' => [
        'subject' => 'New newsletter subscriber',
        'fields' => ['email' => ['Email', 200, true]],
        'success' => 'Thank you for subscribing. You are on the list for our briefing.',
    ],
    'contact' => [
        'subject' => 'New contact message',
        'fields' => [
            'name' => ['Name', 120, true],
            'email' => ['Email', 200, true],
            'department' => ['Department', 120, true],
            'message' => ['Message', 5000, true],
        ],
        'success' => 'Thank you. Your message has been sent and we will reply by email.',
    ],
    'pr' => [
        'subject' => 'New press release submission',
        'fields' => [
            'company' => ['Company', 160, true],
            'email' => ['Media contact email', 200, true],
            'headline' => ['Headline', 250, true],
            'category' => ['Industry category', 120, true],
            'dateline' => ['Dateline', 120, true],
            'summary' => ['Executive summary', 600, true],
            'body' => ['Press release body', 20000, true],
            'media_url' => ['Image / media kit URL', 500, false],
        ],
        'success' => 'Thank you. Your press release has been received and will be reviewed by our editorial desk.',
    ],
];

$type = field('type', 20);
if (!isset($forms[$type])) {
    respond(400, false, 'Unknown form.');
}
$form = $forms[$type];

// Spam traps: the hidden "website" field must stay empty and humans take more than a moment.
if (field('website', 200) !== '' || (int) field('elapsed', 12) < MIN_FILL_MS) {
    respond(200, true, $form['success']);
}

// Collect and validate fields.
$values = [];
foreach ($form['fields'] as $name => [$label, $max, $required]) {
    $value = field($name, $max);
    if ($required && $value === '') {
        respond(422, false, "Please fill in the {$label} field.");
    }
    $values[$name] = $value;
}

$email = oneLine($values['email']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, false, 'Please enter a valid email address.');
}
if ($type === 'pr' && $values['media_url'] !== '' && !filter_var($values['media_url'], FILTER_VALIDATE_URL)) {
    respond(422, false, 'Please enter a valid image or media kit URL, or leave it blank.');
}

// Simple per-IP rate limit.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/gbnt_rate_' . sha1($ip);
$now = time();
$recent = [];
if (is_readable($rateFile)) {
    $recent = array_filter(
        array_map('intval', explode(',', (string) file_get_contents($rateFile))),
        fn ($t) => $t > $now - RATE_WINDOW
    );
}
if (count($recent) >= RATE_LIMIT) {
    respond(429, false, 'Too many submissions. Please wait a few minutes and try again.');
}
$recent[] = $now;
@file_put_contents($rateFile, implode(',', $recent), LOCK_EX);

// Build the email.
$page = oneLine(field('page', 300));
$lines = [];
foreach ($form['fields'] as $name => [$label]) {
    $value = $values[$name] === '' ? '(not provided)' : $values[$name];
    $lines[] = str_contains($value, "\n") ? "{$label}:\n{$value}\n" : "{$label}: {$value}";
}
$lines[] = '';
$lines[] = 'Submitted: ' . gmdate('Y-m-d H:i:s') . ' UTC';
$lines[] = 'Page: ' . ($page !== '' ? $page : '(unknown)');
$lines[] = 'IP address: ' . $ip;
$body = SITE_NAME . " website form\n\n" . implode("\n", $lines) . "\n";

$summary = match ($type) {
    'contact' => oneLine($values['name']),
    'pr' => oneLine($values['company']),
    default => $email,
};
$subject = '[' . SITE_NAME . '] ' . $form['subject'] . ': ' . mb_substr($summary, 0, 80);
$encodedSubject = function_exists('mb_encode_mimeheader')
    ? mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n")
    : $subject;

$headers = [
    'From: ' . SITE_NAME . ' <' . SENDER . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: GBNT-Forms',
];

// Keep a private backup copy outside the public web root when possible.
$backupDir = dirname($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) . '/form-submissions';
if (!is_dir($backupDir) && !@mkdir($backupDir, 0700, true)) {
    $backupDir = __DIR__ . '/submissions';
    @mkdir($backupDir, 0700, true);
}
@file_put_contents(
    $backupDir . '/' . gmdate('Y-m') . '.jsonl',
    json_encode(['time' => gmdate('c'), 'type' => $type, 'ip' => $ip, 'page' => $page, 'data' => $values]) . "\n",
    FILE_APPEND | LOCK_EX
);

$sent = mail(RECIPIENT, $encodedSubject, $body, implode("\r\n", $headers), '-f' . SENDER);

if (!$sent) {
    respond(500, false, 'Sorry, we could not send your submission right now. Please email info@globalbusinessnewstoday.com directly.');
}

respond(200, true, $form['success']);
